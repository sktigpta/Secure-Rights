"use client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { ChevronUp, ChevronDown, FileText, Eye, X, Calendar, User, Video, ExternalLink } from "lucide-react"

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

  const openYouTubeVideo = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
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

      {/* Enhanced Details Modal */}
      {showDetails && selectedVideo && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Video Analysis Report</h2>
                  <p className="text-sm text-gray-600 line-clamp-1">{videoData[selectedVideo.videoId]?.title || "Untitled Video"}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="flex items-center gap-1 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => handleDMCA(selectedVideo.videoId, videoData[selectedVideo.videoId]?.title)}
                  >
                    <FileText size={12} />
                    Generate DMCA
                  </button>
                  <button
                    onClick={closeDetails}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Main Content Layout */}
              <div className="flex gap-4 mb-4">
                {/* Left Side - Thumbnail */}
                <div className="flex-shrink-0">
                  <div className="relative group cursor-pointer" onClick={() => openYouTubeVideo(selectedVideo.videoId)}>
                    <img 
                      src={`https://img.youtube.com/vi/${selectedVideo.videoId}/maxresdefault.jpg`} 
                      alt={videoData[selectedVideo.videoId]?.title || "No title available"} 
                      className="w-64 h-36 object-cover rounded-lg shadow-md border border-gray-200 group-hover:opacity-90 transition-opacity duration-200" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all duration-200">
                      <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ExternalLink size={16} className="text-gray-700" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Copyright Analysis */}
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-800 mb-3">Copyright Analysis</h4>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Copy Percentage</span>
                      <span className={`text-2xl font-bold ${
                        selectedVideo.copyPercentage > 70 ? "text-green-600" : 
                        selectedVideo.copyPercentage > 30 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {selectedVideo.copyPercentage?.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          selectedVideo.copyPercentage > 70 ? "bg-gradient-to-r from-green-500 to-green-600" : 
                          selectedVideo.copyPercentage > 30 ? "bg-gradient-to-r from-amber-500 to-amber-600" : 
                          "bg-gradient-to-r from-red-500 to-red-600"
                        }`}
                        style={{ width: `${Math.min(selectedVideo.copyPercentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0%</span>
                      <span className="text-red-600">Clean</span>
                      <span className="text-amber-600">Medium Risk</span>
                      <span className="text-green-600">High Copy</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Details */}
              <div className="mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <User className="text-gray-400" size={14} />
                    <div>
                      <p className="text-xs text-gray-500">Channel</p>
                      <p className="text-xs font-medium text-gray-800 truncate">{videoData[selectedVideo.videoId]?.author || "Unknown"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <Video className="text-gray-400" size={14} />
                    <div>
                      <p className="text-xs text-gray-500">Video ID</p>
                      <p className="text-xs font-mono text-gray-800 truncate">{selectedVideo.videoId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <Calendar className="text-gray-400" size={14} />
                    <div>
                      <p className="text-xs text-gray-500">Processed</p>
                      <p className="text-xs font-medium text-gray-800">{formatFirebaseTimestamp(selectedVideo.processedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${selectedVideo.copied ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`text-xs font-medium ${selectedVideo.copied ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedVideo.copied ? "Copyright Issues" : "Clean Content"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Analysis */}
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">Timeline Analysis</h4>
                
                <div className="mb-4">
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-sm"></div>
                      <span>Original Content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-sm"></div>
                      <span>Copied Content</span>
                    </div>
                  </div>
                  
                  {/* Timeline Bar */}
                  <div className="relative mb-2">
                    <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-300">
                      {generateTimeline(selectedVideo.timestamps, selectedVideo.totalDuration || 300).map((segment, index) => (
                        <div
                          key={index}
                          className={`absolute top-0 h-full transition-all duration-500 cursor-pointer ${
                            segment.copied ? 
                            'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-500 hover:to-green-700' : 
                            'bg-gradient-to-b from-red-400 to-red-600 hover:from-red-500 hover:to-red-700'
                          }`}
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
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Copyright Violations Detected ({selectedVideo.timestamps.length})
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedVideo.timestamps.map((timestamp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              Violation Segment {index + 1}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                            {timestamp.start} - {timestamp.end}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-full h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg mb-4"></div>
                    <div className="flex justify-between text-xs text-gray-500 mb-4">
                      <span>0:00</span>
                      <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.25))}</span>
                      <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.5))}</span>
                      <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.75))}</span>
                      <span>{secondsToTime(selectedVideo.totalDuration || 300)}</span>
                    </div>
                    <div className="text-red-600 font-medium text-base mb-1">✓ Clean Content</div>
                    <p className="text-sm text-gray-600">No copyright violations detected in this video</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProcessedVideos;