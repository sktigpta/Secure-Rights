"use client"

import { useEffect, useState } from "react"
import { RefreshCw, ChevronUp, ChevronDown, ExternalLink, AlertCircle, Loader } from "lucide-react"
import "./styles.css"

interface FetchedVideosProps {
  onNotification: (message: string, type: "error" | "warning" | "success") => void
}

const FetchedVideos = ({ onNotification }: FetchedVideosProps) => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fetchStoredVideos = async () => {
    try {
      const response = await fetch("https://gdg-bakend.vercel.app/api/youtube/stored-videos")
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
      const response = await fetch("https://gdg-bakend.vercel.app/api/youtube/get-videos", { method: "POST" })
      if (!response.ok) throw new Error("Failed to fetch new videos")

      await fetchStoredVideos()
      onNotification("Videos refreshed successfully", "success")
    } catch (error) {
      onNotification(error.message, "error")
    }
    setRefreshing(false)
  }

  const openYoutubeVideo = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <h3>Fetched Videos</h3>
          <span className="badge">{videos?.length || 0}</span>
        </div>
        <div className="card-actions">
          <button className="icon-button" onClick={addNewVideos} disabled={refreshing} title="Refresh videos">
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
          <button
            className="icon-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="card-content">
          {loading ? (
            <div className="loading-state">Loading videos...</div>
          ) : videos.length > 0 ? (
            <div className="video-grid">
              {videos.map((video, index) => (
                <div
                  key={video.videoId || index}
                  className="video-card"
                  onClick={() => openYoutubeVideo(video.videoId)}
                >
                  <div className="video-thumbnail-container">
                    <img
                      src={
                        video.videoId
                          ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
                          : "/placeholder.svg?height=120&width=160"
                      }
                      alt={video.title || "No title available"}
                      className="video-thumbnail"
                    />
                    <div className="video-overlay">
                      <ExternalLink size={16} />
                    </div>
                  </div>
                  <div className="video-details">
                    <h4 className="video-title">
                      {video.title?.length > 60
                        ? video.title.substring(0, 57) + "..."
                        : video.title || "Untitled Video"}
                    </h4>
                    <p className="video-date">
                      {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : "Unknown Date"}
                    </p>

                    {/* Show Processing or Failed Status Only */}
                    {video.status === "failed" && (
                      <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
                        <AlertCircle size={14} /> Failed
                      </div>
                    )}
                    {video.status === "processing" && (
                      <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                        <Loader size={14} className="animate-spin" /> Processing...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No videos found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default FetchedVideos
