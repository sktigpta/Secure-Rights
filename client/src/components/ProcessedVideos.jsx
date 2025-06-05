"use client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { ChevronUp, ChevronDown, FileText, Eye, X, Calendar, User, Video, Youtube, Clock, AlertTriangle, CheckCircle } from "lucide-react"

const ProcessedVideos = ({ onNotification }) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([])
  const [videoData, setVideoData] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL;

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatFirebaseTimestamp = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return "Unknown"
    const date = new Date(timestamp._seconds * 1000)
    return isMobile ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : date.toLocaleDateString()
  }

  const handleDMCA = (videoId, title) => {
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
    setAnimatedPercentage(0)
    setTimeout(() => {
      const target = video.copyPercentage || 0
      let current = 0
      const increment = target / 50
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setAnimatedPercentage(target)
          clearInterval(timer)
        } else {
          setAnimatedPercentage(current)
        }
      }, 20)
    }, 100)
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedVideo(null)
    setAnimatedPercentage(0)
  }

  const openVideoInYoutube = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
  }

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number)
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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
    
    const sortedTimestamps = [...timestamps].sort((a, b) => 
      timeToSeconds(a.start) - timeToSeconds(b.start)
    )
    
    sortedTimestamps.forEach((timestamp) => {
      const startTime = timeToSeconds(timestamp.start)
      const endTime = timeToSeconds(timestamp.end)
      
      if (currentTime < startTime) {
        segments.push({
          start: currentTime,
          end: startTime,
          copied: false,
          duration: startTime - currentTime
        })
      }
      
      segments.push({
        start: startTime,
        end: endTime,
        copied: true,
        duration: endTime - startTime
      })
      
      currentTime = Math.max(currentTime, endTime)
    })
    
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
        <div className="p-3 md:p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold text-gray-800 m-0">
              {isMobile ? "Videos" : "Processed Videos"}
            </h3>
            <span className="bg-sky-100 text-sky-700 text-xs font-medium py-0.5 px-2 rounded-full">
              {videos?.length || 0}
            </span>
          </div>
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
            onClick={() => setIsCollapsed(!isCollapsed)} 
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-2 md:p-4 flex-1 overflow-y-scroll h-[80vh]">
            {videos.length > 0 ? (
              <div className="flex flex-col gap-2 md:gap-4">
                {videos.map((video) => (
                  <div key={video.videoId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Mobile Layout */}
                    {isMobile ? (
                      <div className="p-3">
                        <div className="flex gap-3 mb-3">
                          <div className="relative">
                            <img 
                              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                              alt={videoData[video.videoId]?.title || "No title available"} 
                              className="w-20 h-12 object-cover rounded-md" 
                            />
                            <div className="absolute -top-1 -right-1">
                              <Youtube size={12} className="text-red-600 bg-white rounded-full p-0.5" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium line-clamp-2 text-gray-800 mb-1">
                              {videoData[video.videoId]?.title || "Untitled Video"}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <User size={10} />
                              <span className="truncate">{videoData[video.videoId]?.author || "Unknown"}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Compact Info Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${video.copyPercentage > 70 ? "bg-red-500" : video.copyPercentage > 30 ? "bg-yellow-500" : "bg-green-500"}`}></div>
                              <span className="text-xs font-medium text-gray-800">
                                {video.copyPercentage?.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={10} className="text-gray-400" />
                              <span className="text-xs text-gray-500">{formatFirebaseTimestamp(video.processedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {video.copied ? (
                              <AlertTriangle size={12} className="text-red-500" />
                            ) : (
                              <CheckCircle size={12} className="text-green-500" />
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 flex items-center justify-center gap-1 bg-gray-600 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors duration-200"
                            onClick={() => handleViewDetails(video)}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                          <button 
                            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                            onClick={() => handleDMCA(video.videoId, videoData[video.videoId]?.title)}
                          >
                            <FileText size={12} />
                            <span>DMCA</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Desktop Layout */
                      <>
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">No processed videos available</div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Details Modal - Mobile Responsive */}
      {showDetails && selectedVideo && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-3">
          <div className={`bg-white/95 backdrop-blur-md rounded-xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden shadow-xl border border-white/20 ${isMobile ? 'max-w-sm' : 'max-w-4xl'}`}>
            {/* Header */}
            <div className="px-3 md:px-4 py-3 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <h2 className={`font-bold text-gray-800 ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {isMobile ? "Video Analysis" : "Video Analysis Report"}
                </h2>
                <div className="flex items-center gap-2">
                  {!isMobile && (
                    <button
                      onClick={() => handleDMCA(selectedVideo.videoId, videoData[selectedVideo.videoId]?.title)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                    >
                      <FileText size={14} />
                      <span>Generate DMCA</span>
                    </button>
                  )}
                  <button
                    onClick={closeDetails}
                    className="p-1.5 hover:bg-gray-100/50 rounded-full transition-all duration-200"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-3 md:p-4 overflow-y-auto max-h-[calc(90vh-80px)] md:max-h-[calc(85vh-80px)]">
              {isMobile ? (
                /* Mobile Layout - Simplified */
                <div className="space-y-4">
                  {/* Video Info */}
                  <div className="text-center">
                    <div 
                      className="relative cursor-pointer group mb-3"
                      onClick={() => openVideoInYoutube(selectedVideo.videoId)}
                    >
                      <img 
                        src={`https://img.youtube.com/vi/${selectedVideo.videoId}/maxresdefault.jpg`} 
                        alt={videoData[selectedVideo.videoId]?.title || "No title available"} 
                        className="w-full h-32 object-cover rounded-lg shadow-md border border-gray-200/50 group-hover:shadow-lg transition-all duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Youtube className="text-white" size={24} />
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-2">
                      {videoData[selectedVideo.videoId]?.title || "Untitled Video"}
                    </h3>
                    
                    <div className="text-xs text-gray-600 mb-3">
                      {videoData[selectedVideo.videoId]?.author || "Unknown"}
                    </div>
                  </div>

                  {/* Copy Percentage */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-4 rounded-lg border border-gray-200/50 text-center">
                    <div className={`text-2xl font-bold mb-2 ${
                      animatedPercentage > 70 ? "text-red-500" : 
                      animatedPercentage > 30 ? "text-amber-500" : "text-green-500"
                    }`}>
                      {animatedPercentage.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Copy Percentage</p>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                          animatedPercentage > 70 ? "bg-gradient-to-r from-red-500 to-red-600" : 
                          animatedPercentage > 30 ? "bg-gradient-to-r from-amber-500 to-amber-600" : 
                          "bg-gradient-to-r from-green-500 to-green-600"
                        }`}
                        style={{ width: `${Math.min(animatedPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Simple Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Timeline</h4>
                    <div className="w-full h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg overflow-hidden relative border border-gray-300/50">
                      {generateTimeline(selectedVideo.timestamps, selectedVideo.totalDuration || 300).map((segment, index) => (
                        <div
                          key={index}
                          className={`absolute top-0 h-full ${
                            segment.copied ? 
                            'bg-gradient-to-r from-red-400 to-red-600' : 
                            'bg-gradient-to-r from-green-400 to-green-600'
                          }`}
                          style={{
                            left: `${(segment.start / (selectedVideo.totalDuration || 300)) * 100}%`,
                            width: `${(segment.duration / (selectedVideo.totalDuration || 300)) * 100}%`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Violations Count */}
                  {selectedVideo.timestamps && selectedVideo.timestamps.length > 0 ? (
                    <div className="bg-red-50/50 rounded-lg p-3 border border-red-200/50 text-center">
                      <div className="text-red-600 font-medium text-sm mb-1">
                        ⚠️ {selectedVideo.timestamps.length} Violations Found
                      </div>
                      <p className="text-xs text-gray-600">Copyright issues detected</p>
                    </div>
                  ) : (
                    <div className="bg-green-50/50 rounded-lg p-3 border border-green-200/50 text-center">
                      <div className="text-green-600 font-medium text-sm mb-1">✓ Clean Content</div>
                      <p className="text-xs text-gray-600">No violations detected</p>
                    </div>
                  )}

                  {/* Mobile DMCA Button */}
                  <button
                    onClick={() => handleDMCA(selectedVideo.videoId, videoData[selectedVideo.videoId]?.title)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                  >
                    <FileText size={16} />
                    <span>Generate DMCA Report</span>
                  </button>
                </div>
              ) : (
                /* Desktop Layout - Full Details */
                <div className="flex gap-4">
                  <div className="w-64 flex-shrink-0 space-y-3">
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => openVideoInYoutube(selectedVideo.videoId)}
                    >
                      <img 
                        src={`https://img.youtube.com/vi/${selectedVideo.videoId}/maxresdefault.jpg`} 
                        alt={videoData[selectedVideo.videoId]?.title || "No title available"} 
                        className="w-full h-36 object-cover rounded-lg shadow-md border border-gray-200/50 group-hover:shadow-lg transition-all duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                          Watch on YouTube
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
                        {videoData[selectedVideo.videoId]?.title || "Untitled Video"}
                      </h3>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50/70 rounded-md">
                          <User className="text-gray-500" size={12} />
                          <div>
                            <p className="text-xs text-gray-500">Channel</p>
                            <p className="text-xs font-medium text-gray-800">{videoData[selectedVideo.videoId]?.author || "Unknown"}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50/70 rounded-md">
                          <Video className="text-gray-500" size={12} />
                          <div>
                            <p className="text-xs text-gray-500">Video ID</p>
                            <p className="font-mono text-xs text-gray-800">{selectedVideo.videoId}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50/70 rounded-md">
                          <Calendar className="text-gray-500" size={12} />
                          <div>
                            <p className="text-xs text-gray-500">Processed</p>
                            <p className="text-xs font-medium text-gray-800">{formatFirebaseTimestamp(selectedVideo.processedAt)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-end gap-2 p-1.5 bg-gray-50/70 rounded-md">
                          <div className={`w-3 h-3 rounded-full ${selectedVideo.copied ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Status</p>
                            <p className={`text-xs font-medium ${selectedVideo.copied ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedVideo.copied ? "Copyright Issues Found" : "Clean Content"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
                      <div className="text-center">
                        <div className={`text-3xl font-bold mb-2 ${
                          animatedPercentage > 70 ? "text-red-500" : 
                          animatedPercentage > 30 ? "text-amber-500" : "text-green-500"
                        }`}>
                          {animatedPercentage.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Copy Percentage</p>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                              animatedPercentage > 70 ? "bg-gradient-to-r from-red-500 to-red-600" : 
                              animatedPercentage > 30 ? "bg-gradient-to-r from-amber-500 to-amber-600" : 
                              "bg-gradient-to-r from-green-500 to-green-600"
                            }`}
                            style={{ width: `${Math.min(animatedPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800 mb-3">Timeline Analysis</h4>
                      
                      <div className="mb-4">
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-sm"></div>
                            <span>Original Content</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-sm"></div>
                            <span>Copied Content</span>
                          </div>
                        </div>
                        
                        <div className="relative mb-2">
                          <div className="w-full h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg overflow-hidden relative border border-gray-300/50">
                            {generateTimeline(selectedVideo.timestamps, selectedVideo.totalDuration || 300).map((segment, index) => (
                              <div
                                key={index}
                                className={`absolute top-0 h-full transition-all duration-500 cursor-pointer ${
                                  segment.copied ? 
                                  'bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700' : 
                                  'bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700'
                                }`}
                                style={{
                                  left: `${(segment.start / (selectedVideo.totalDuration || 300)) * 100}%`,
                                  width: `${(segment.duration / (selectedVideo.totalDuration || 300)) * 100}%`
                                }}
                                title={`${secondsToTime(segment.start)} - ${secondsToTime(segment.end)}: ${segment.copied ? 'Copied Content' : 'Original Content'}`}
                              ></div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0:00</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.25))}</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.5))}</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.75))}</span>
                            <span>{secondsToTime(selectedVideo.totalDuration || 300)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {selectedVideo.timestamps && selectedVideo.timestamps.length > 0 ? (
                        <div className="bg-red-50/50 rounded-lg p-4 border border-red-200/50">
                          <h5 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Copyright Violations Detected ({selectedVideo.timestamps.length})
                          </h5>
                          <div className="grid gap-2 max-h-48 overflow-y-auto">
                            {selectedVideo.timestamps.map((timestamp, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white/80 border border-red-200/50 rounded-md hover:bg-white/90 transition-all duration-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm font-medium text-gray-800">
                                    Violation {index + 1}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded-full">
                                  {timestamp.start} - {timestamp.end}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-green-50/50 rounded-lg border border-green-200/50">
                          <div className="w-full h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg mb-4"></div>
                          <div className="flex justify-between text-xs text-gray-500 mb-4">
                            <span>0:00</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.25))}</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.5))}</span>
                            <span>{secondsToTime(Math.floor((selectedVideo.totalDuration || 300) * 0.75))}</span>
                            <span>{secondsToTime(selectedVideo.totalDuration || 300)}</span>
                          </div>
                          <div className="text-green-600 font-medium text-base mb-1">✓ Clean Content</div>
                          <p className="text-gray-600 text-sm">No copyright violations detected in this video</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProcessedVideos;