"use client"
import { useEffect, useState } from "react"
import { RefreshCw, ChevronUp, ChevronDown, ExternalLink, AlertCircle, Loader } from "lucide-react"

const FetchedVideos = ({ onNotification }) => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchStoredVideos = async () => {
    try {
      const response = await fetch(`${API_URL}/youtube/stored-videos`)
      if (!response.ok) throw new Error("Failed to fetch videos")

      const data = await response.json()
      setVideos(Array.isArray(data?.videos) ? data.videos : [])
    } catch (error) {
      onNotification(error.message, "error")
      setVideos([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStoredVideos()
    const interval = setInterval(fetchStoredVideos, 600000)

    return () => clearInterval(interval)
  }, [])

  const addNewVideos = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`${API_URL}/api/youtube/get-videos`, { method: "POST" })
      if (!response.ok) throw new Error("Failed to fetch new videos")

      await fetchStoredVideos()
      onNotification("Videos refreshed successfully", "success")
    } catch (error) {
      onNotification(error.message, "error")
    }
    setRefreshing(false)
  }

  const openYoutubeVideo = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
  }

  return (
    <div className="bg-transparent rounded-lg shadow-none border border-gray-200 max-h-[75vh] flex flex-col">
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800 m-0">Fetched Videos</h3>
          <span className="bg-sky-100 text-sky-700 text-xs font-medium py-0.5 px-2 rounded-full">{videos?.length || 0}</span>
        </div>
        <div className="flex gap-2">
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200" 
            onClick={addNewVideos} 
            disabled={refreshing} 
            title="Refresh videos"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
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
          {loading ? (
            <div className="text-center text-gray-500 py-8 text-sm">Loading videos...</div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4">
              {videos.map((video, index) => (
                <div
                  key={video.videoId || index}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-none hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  onClick={() => openYoutubeVideo(video.videoId)}
                >
                  <div className="relative aspect-[30/9] overflow-hidden">
                    <img
                      src={
                        video.videoId
                          ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
                          : "/placeholder.svg?height=120&width=160"
                      }
                      alt={video.title || "No title available"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <ExternalLink size={16} />
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium mb-1 line-clamp-2 leading-tight">
                      {video.title?.length > 60
                        ? video.title.substring(0, 57) + "..."
                        : video.title || "Untitled Video"}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : "Unknown Date"}
                    </p>

                    {video.status === "failed" && (
                      <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                        <AlertCircle size={14} /> Failed
                      </div>
                    )}
                    {video.status === "processing" && (
                      <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">
                        <Loader size={14} className="animate-spin" /> Processing...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 text-sm">No videos found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default FetchedVideos