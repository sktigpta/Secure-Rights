"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronUp, ChevronDown, FileText } from "lucide-react"

const ProcessedVideos = ({ onNotification }) => {
  const [videos, setVideos] = useState([])
  const [videoData, setVideoData] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL;

  const formatFirebaseTimestamp = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return "Unknown"
    const date = new Date(timestamp._seconds * 1000)
    return date.toLocaleDateString()
  }

  const handleDMCA = (videoId, title) => {
    onNotification(`Generating DMCA for "${title}"`, "success")
    // Implement DMCA generation functionality
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
                    <button 
                      className="flex items-center gap-1.5 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                      onClick={() => handleDMCA(video.videoId, videoData[video.videoId]?.title)}
                    >
                      <FileText size={14} />
                      <span>Generate DMCA</span>
                    </button>
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
  )
}

export default ProcessedVideos