"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronUp, ChevronDown, FileText } from "lucide-react"
import "./styles.css"

interface ProcessedVideosProps {
  onNotification: (message: string, type: "error" | "warning" | "success") => void
}

const ProcessedVideos = ({ onNotification }: ProcessedVideosProps) => {
  const [videos, setVideos] = useState<{ videoId: string; copyPercentage: number; copied: boolean; processedAt: any }[]>([])
  const [videoData, setVideoData] = useState<Record<string, { title: string; author: string }>>({})  
  const [isCollapsed, setIsCollapsed] = useState(false)

  const formatFirebaseTimestamp = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return "Unknown"
    const date = new Date(timestamp._seconds * 1000)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const handleDMCA = (videoId, title) => {
    onNotification(`Generating DMCA for "${title}"`, "success")
    // Implement DMCA generation functionality
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
    }, 600000)

    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/processed")
      const processedVideos = response.data?.videos || []
      setVideos(processedVideos)

      processedVideos.forEach((video) => fetchVideoDetails(video.videoId))
    } catch (error) {
      onNotification("Failed to fetch processed videos", "error")
    }
  }

  const fetchVideoDetails = async (videoId) => {
    try {
      const res = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      )
  
      setVideoData((prev) => ({
        ...prev,
        [videoId]: { 
          title: res.data?.title || "No Title", 
          author: res.data?.author_name || "Unknown" 
        },
      }))
    } catch (error) {
      console.error(`Error fetching details for video ${videoId}:`, error)
    }
  }
 

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <h3>Processed Videos</h3>
          <span className="badge">{videos?.length || 0}</span>
        </div>
        <div className="card-actions">
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
          {videos.length > 0 ? (
            <div className="processed-videos">
              {videos.map((video) => (
                <div key={video.videoId} className="processed-video-card">
                  <div className="processed-video-header">
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt={videoData[video.videoId]?.title || "No title available"}
                      className="processed-thumbnail"
                    />
                    <div className="processed-video-title">
                      <h4>{videoData[video.videoId]?.title || "Untitled Video"}</h4>
                    </div>
                  </div>
                  <div className="processed-video-details">
                    <div className="processed-stats">
                      <div className="stat">
                        <span className="stat-label">Copy Percentage:</span>
                        <span className={`stat-value ${video.copyPercentage > 70 ? "high-copy" : "low-copy"}`}>
                          {video.copyPercentage?.toFixed(2)}%
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Status:</span>
                        <span className={`stat-value ${video.copied ? "copied" : "not-copied"}`}>
                          {video.copied ? "Copied" : "Not Copied"}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label"></span>
                        <span className="stat-value">{formatFirebaseTimestamp(video.processedAt)}</span>
                      </div>
                    </div>
                    <button
                      className="dmca-button"
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
            <div className="empty-state">No processed videos available</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProcessedVideos

