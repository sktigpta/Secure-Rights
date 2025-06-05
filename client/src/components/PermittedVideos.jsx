"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react"

const PermittedVideos = ({ onNotification }) => {
  const [videos, setVideos] = useState([])
  const [videoData, setVideoData] = useState({})
  const [newVideoId, setNewVideoId] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const videosRes = await axios.get(`${API_URL}/permissions/permitted-videos`)
      if (Array.isArray(videosRes.data.permittedVideos)) {
        setVideos(videosRes.data.permittedVideos)
        videosRes.data.permittedVideos.forEach((video) => fetchVideoDetails(video.videoId))
      } else {
        onNotification("Invalid data format received for videos", "error")
      }
    } catch (error) {
      onNotification("Failed to fetch permitted videos", "error")
    }
  }

  const fetchVideoDetails = async (videoId) => {
    try {
      const res = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
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
      const res = await axios.post(`${API_URL}/permissions/permitted-videos`, {
        videoId: newVideoId,
      })
      setVideos((prevVideos) => [...prevVideos, { id: res.data.id, videoId: newVideoId }])
      fetchVideoDetails(newVideoId)
      setNewVideoId("")
      onNotification("Video added to permitted list", "success")
    } catch (error) {
      onNotification("Failed to add video to permitted list", "error")
    }
  }

  const handleDeleteVideo = async (id, title) => {
    try {
      console.log(`Attempting to delete video with ID: ${id}`);
      
      const response = await axios.delete(`${API_URL}/permissions/permitted-videos/${id}`);
  
      if (response.status === 200 || response.status === 204) {
        setVideos(videos.filter((video) => video.id !== id));
        onNotification(`"${title || "Video"}" removed from permitted list`, "success");
      } else {
        console.error("Unexpected response status:", response.status);
        onNotification("Failed to delete video", "error");
      }
    } catch (error) {
      console.error("Error deleting video:", error.response?.data || error.message);
      onNotification("Failed to delete video", "error");
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddVideo()
    }
  }

  return (
    <div className="bg-transparent rounded-lg shadow-none border border-gray-200 max-h-[75vh] flex flex-col">
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800 m-0">Permitted Videos</h3>
          <span className="bg-sky-100 text-sky-700 text-xs font-medium py-0.5 px-2 rounded-full">{Array.isArray(videos) ? videos.length : 0}</span>
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
          <div className="flex mb-4">
            <input
              type="text"
              className="flex-1 py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-600 transition-colors duration-200"
              placeholder="Enter Video ID or URL"
              value={newVideoId}
              onChange={(e) => setNewVideoId(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button 
              className="flex items-center justify-center bg-blue-600 text-white rounded-lg ml-2 w-10 hover:bg-blue-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleAddVideo} 
              disabled={!newVideoId.trim()}
            >
              <Plus size={16} />
            </button>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4">
              {videos.map((video) => (
                <div key={video.videoId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                    alt={videoData[video.videoId]?.title || "No title available"}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-sm font-medium mb-3 line-clamp-2 overflow-hidden">{videoData[video.videoId]?.title || "Untitled Video"}</h4>
                    <button
                      className="flex items-center gap-1.5 bg-red-50 text-red-700 py-1.5 px-3 rounded-lg text-xs font-medium w-full justify-center hover:bg-red-100 transition-colors duration-200"
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
            <div className="text-center text-gray-500 py-8 text-sm">No permitted videos</div>
          )}
        </div>
      )}
    </div>
  )
}

export default PermittedVideos