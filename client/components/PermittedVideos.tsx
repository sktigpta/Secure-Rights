"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react"
import "./styles.css"

interface PermittedVideosProps {
  onNotification: (message: string, type: "error" | "warning" | "success") => void
}

const PermittedVideos = ({ onNotification }: PermittedVideosProps) => {
  const [videos, setVideos] = useState([])
  const [videoData, setVideoData] = useState({})
  const [newVideoId, setNewVideoId] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const videosRes = await axios.get("https://backend.securerights.app/api/permissions/permitted-videos")
      setVideos(videosRes.data.permittedVideos)
      videosRes.data.permittedVideos.forEach((video) => fetchVideoDetails(video.videoId))
    } catch (error) {
      onNotification("Failed to fetch permitted videos", "error")
    }
  }

  const fetchVideoDetails = async (videoId) => {
    try {
      const res = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      )
      setVideoData((prev) => ({
        ...prev,
        [videoId]: { title: res.data.title, author: res.data.author_name },
      }))
    } catch (error) {
      console.error("Error fetching video details:", error)
    }
  }

  const handleAddVideo = async () => {
    if (!newVideoId.trim()) return

    try {
      const res = await axios.post("https://backend.securerights.app/api/permissions/permitted-videos", {
        videoId: newVideoId,
      })
      setVideos([...videos, { id: res.data.id, videoId: newVideoId }])
      fetchVideoDetails(newVideoId)
      setNewVideoId("")
      onNotification("Video added to permitted list", "success")
    } catch (error) {
      onNotification("Failed to add video to permitted list", "error")
    }
  }

  const handleDeleteVideo = async (id, title) => {
    try {
      await axios.delete(`https://backend.securerights.app/api/permissions/permitted-videos/${id}`)
      setVideos(videos.filter((video) => video.id !== id))
      onNotification(`"${title || "Video"}" removed from permitted list`, "success")
    } catch (error) {
      onNotification("Failed to delete video", "error")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddVideo()
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <h3>Permitted Videos</h3>
          <span className="badge">{videos.length}</span>
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
          <div className="permitted-input-container">
            <input
              type="text"
              className="permitted-input"
              placeholder="Enter Video ID"
              value={newVideoId}
              onChange={(e) => setNewVideoId(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button className="permitted-add-button" onClick={handleAddVideo} disabled={!newVideoId.trim()}>
              <Plus size={16} />
            </button>
          </div>

          {videos.length > 0 ? (
            <div className="permitted-videos">
              {videos.map((video) => (
                <div key={video.videoId} className="permitted-video-card">
                  <img
                    src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                    alt={videoData[video.videoId]?.title || "No title available"}
                    className="permitted-thumbnail"
                  />
                  <div className="permitted-video-info">
                    <h4 className="permitted-video-title">{videoData[video.videoId]?.title || "Untitled Video"}</h4>
                    <button
                      className="permitted-delete-button"
                      onClick={() => handleDeleteVideo(video.id, videoData[video.videoId]?.title)}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No permitted videos</div>
          )}
        </div>
      )}
    </div>
  )
}

export default PermittedVideos

