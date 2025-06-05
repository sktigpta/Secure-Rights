"use client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { ChevronUp, ChevronDown, FileText, Eye, X } from "lucide-react"

const ProcessedVideos = ({ onNotification }) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([])
  const [videoData, setVideoData] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL;

  const formatFirebaseTimestamp = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return "Unknown"
    const date = new Date(timestamp._seconds * 1000)
    return date.toLocaleDateString()
  }

  const handleDMCA = (videoId, title) => {
    // Navigate to DMCA report page with pre-filled data
    navigate('/dmca/report', {
      state: {
        videoData: {
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title,
          description: `This video has been identified as containing potentially infringing content with a copy percentage of ${videos.find(v => v.videoId === videoId)?.copyPercentage || 0}%.`
        }
      }
    });
  }

  const handleViewDetails = (video) => {
    setSelectedVideo(video)
    setShowDetails(true)
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedVideo(null)
  }

  // Convert timestamp string to seconds for timeline calculations
  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number)
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  // Format seconds back to timestamp string
  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Generate timeline segments for visualization
  const generateTimeline = (timestamps, totalDuration = 300) => {
    if (!timestamps || timestamps.length === 0) {
      return [{
        start: 0,
        end: totalDuration,
        copied: false,
        duration: totalDuration
      }]
    }
    
    const segments = []
    let currentTime = 0
    
    // Sort timestamps by start time
    const sortedTimestamps = [...timestamps].sort((a, b) => 
      timeToSeconds(a.start) - timeToSeconds(b.start)
    )
    
    sortedTimestamps.forEach((timestamp) => {
      const startTime = timeToSeconds(timestamp.start)
      const endTime = timeToSeconds(timestamp.end)
      
      // Add non-copied segment before this timestamp (if any)
      if (currentTime < startTime) {
        segments.push({
          start: currentTime,
          end: startTime,
          copied: false,
          duration: startTime - currentTime
        })
      }
      
      // Add copied segment
      segments.push({
        start: startTime,
        end: endTime,
        copied: true,
        duration: endTime - startTime
      })
      
      currentTime = Math.max(currentTime, endTime)
    })
    
    // Add remaining non-copied segment if any
    if (currentTime < totalDuration) {
      segments.push({
        start: currentTime,
        end: totalDuration,
        copied: false,
        duration: totalDuration - currentTime
      })
    }
    
    return segments
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 600000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/processed`)
      const processedVideos = response.data?.videos || []
      setVideos(processedVideos)

      processedVideos.forEach((video) => fetchVideoDetails(video.videoId))
    } catch (error) {
      onNotification("Failed to fetch processed videos", "error")
    }
  }

  const fetchVideoDetails = async (videoId) => {
    try {
      const res = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      setVideoData((prev) => ({
        ...prev,
        [videoId]: { title: res.data?.title || "No Title", author: res.data?.author_name || "Unknown" },
      }))
    } catch (error) {
      console.error(`Error fetching details for video ${videoId}:`, error)
    }
  }

  return (
    <>
      <div className="bg-transparent rounded-lg shadow-none border border-gray-200 max-h-[75vh] flex flex-col">
        <div className="p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800 m-0">Processed Videos</h3>
            <span className="bg-sky-100 text-sky-700 text-xs font-medium py-0.5 px-2 rounded-full">{videos?.length || 0}</span>
          </div>
          <div className="flex gap-2">
            <button 
              className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
              onClick={() => setIsCollapsed(!isCollapsed)} 
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 flex-1 overflow-y-scroll h-[80vh]">
            {videos.length > 0 ? (
              <div className="flex flex-col gap-4">
                {videos.map((video) => (
                  <div key={video.videoId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex gap-3 p-3 border-b border-gray-200">
                      <img 
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                        alt={videoData[video.videoId]?.title || "No title available"} 
                        className="w-[100px] h-[56px] object-cover rounded-md" 
                      />
                      <div className="flex-1 flex items-center">
                        <h4 className="text-sm font-medium line-clamp-2 overflow-hidden">{videoData[video.videoId]?.title || "Untitled Video"}</h4>
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center flex-wrap gap-3">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Copy Percentage:</span>
                          <span className={`text-sm font-medium ${video.copyPercentage > 70 ? "text-red-500" : "text-gray-800"}`}>
                            {video.copyPercentage?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Status:</span>
                          <span className={`text-sm font-medium ${video.copied ? "text-emerald-500" : "text-gray-500"}`}>
                            {video.copied ? "Copied" : "Not Copied"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Processed At:</span>
                          <span className="text-sm font-medium">{formatFirebaseTimestamp(video.processedAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="flex items-center gap-1.5 bg-gray-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors duration-200"
                          onClick={() => handleViewDetails(video)}
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                        <button 
                          className="flex items-center gap-1.5 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                          onClick={() => handleDMCA(video.videoId, videoData[video.videoId]?.title)}
                        >
                          <FileText size={14} />
                          <span>Generate DMCA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">No processed videos available</div>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Video Analysis Details</h2>
                <p className="text-sm text-gray-500 mt-1">{videoData[selectedVideo.videoId]?.title || "Untitled Video"}</p>
              </div>
              <button
                onClick={closeDetails}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Video Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <img 
                      src={`https://img.youtube.com/vi/${selectedVideo.videoId}/mqdefault.jpg`} 
                      alt={videoData[selectedVideo.videoId]?.title || "No title available"} 
                      className="w-[120px] h-[68px] object-cover rounded-lg" 
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-2">{videoData[selectedVideo.videoId]?.title || "Untitled Video"}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Channel: {videoData[selectedVideo.videoId]?.author || "Unknown"}</p>
                        <p>Video ID: {selectedVideo.videoId}</p>
                        <p>Processed: {formatFirebaseTimestamp(selectedVideo.processedAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Copy Percentage</span>
                        <span className={`font-bold ${selectedVideo.copyPercentage > 70 ? "text-red-500" : selectedVideo.copyPercentage > 30 ? "text-amber-500" : "text-green-500"}`}>
                          {selectedVideo.copyPercentage?.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${selectedVideo.copyPercentage > 70 ? "bg-red-500" : selectedVideo.copyPercentage > 30 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(selectedVideo.copyPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedVideo.copied ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {selectedVideo.copied ? "Copyright Content Detected" : "No Copyright Issues"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Analysis */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-4">Timeline Analysis</h4>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-3 bg-green-500 rounded"></div>
                        <span>Original Content</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-3 bg-red-500 rounded"></div>
                        <span>Copied Content</span>
                      </div>
                    </div>
                    
                    {/* Dynamic Timeline Bar */}
                    <div className="relative mb-2">
                      <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden relative">
                        {generateTimeline(selectedVideo.timestamps, selectedVideo.totalDuration || 300).map((segment, index) => (
                          <div
                            key={index}
                            className={`absolute top-0 h-full transition-all duration-300 ${segment.copied ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                            style={{
                              left: `${(segment.start / (selectedVideo.totalDuration || 300)) * 100}%`,
                              width: `${(segment.duration / (selectedVideo.totalDuration || 300)) * 100}%`
                            }}
                            title={`${secondsToTime(segment.start)} - ${secondsToTime(segment.end)}: ${segment.copied ? 'Copied Content' : 'Original Content'}`}
                          ></div>
                        ))}
                      </div>
                      
                      {/* Time markers */}
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0:00</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.25))}</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.5))}</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.75))}</span>
                        <span>{secondsToTime(selectedVideo.totalDuration || 300)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed timestamps */}
                  {selectedVideo.timestamps && selectedVideo.timestamps.length > 0 ? (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-3">Detected Copyright Segments ({selectedVideo.timestamps.length})</h5>
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {selectedVideo.timestamps.map((timestamp, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-800">
                                Segment {index + 1}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 font-mono">
                              {timestamp.start} - {timestamp.end}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-full h-8 bg-green-500 rounded-lg mb-4"></div>
                      <div className="flex justify-between text-xs text-gray-500 mb-4">
                        <span>0:00</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.25))}</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.5))}</span>
                        <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.75))}</span>
                        <span>{secondsToTime(selectedVideo.totalDuration || 300)}</span>
                      </div>
                      <p className="text-gray-500">No copyright content detected in this video</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProcessedVideos;