import { useEffect, useState } from "react";
import axios from "axios";
import "../css/videos-and-cards.css";

const Processed = () => {
    const [videos, setVideos] = useState([]);
    const [videoData, setVideoData] = useState({});

    const formatFirebaseTimestamp = (timestamp) => {
        if (!timestamp || !timestamp._seconds) return "Unknown"; // Handle missing timestamps
        const date = new Date(timestamp._seconds * 1000); // Convert seconds to milliseconds
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
//todo handleDmca
    const handleDMCA = ()=>{

    }

    useEffect(() => {
        fetchData();

        const interval = setInterval(() => {
            fetchData();
        }, 600000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/processed");
            const processedVideos = response.data?.videos || [];
            setVideos(processedVideos);

            processedVideos.forEach((video) => fetchVideoDetails(video.videoId));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchVideoDetails = async (videoId) => {
        try {
            const res = await axios.get(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
            );
            setVideoData((prev) => ({
                ...prev,
                [videoId]: { title: res.data?.title || "No Title", author: res.data?.author_name || "Unknown" },
            }));
        } catch (error) {
            console.error(`Error fetching details for video ${videoId}:`, error);
        }
    };

    return (
        <div style={{ width: "350px" }}>
            <div className="sticky-header">
                <div className="header-content">
                    <h3 style={{ marginTop: "8px" }} className="card-header-title">Processed Videos</h3>
                    <span className="video-count">{videos?.length || 0}</span>
                </div>
            </div>

            <div className="grid">
                <ul style={{ marginTop: "0" }} className="video-list">
                    {videos.length > 0 ? (
                        videos.map((video) => (
                            <li key={video.videoId} className="video-item">
                                <img
                                    src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                                    alt={videoData[video.videoId]?.title || "No title available"}
                                    className="video-thumbnail"
                                />
                                <div className="video-info">
                                    <p className="video-title">
                                        {videoData[video.videoId]?.title?.length > 50
                                            ? videoData[video.videoId]?.title.substring(0, 35) + "..."
                                            : videoData[video.videoId]?.title || "Untitled Video"}
                                    </p>
                                    <p className="video-disc ">Copy Percentage:{video.copyPercentage?.toFixed(2)}%</p>
                                    <p className="video-disc ">Status: {video.copied ? "Copied" : "Not Copied"}</p>
                                    <p className="video-disc">Processed On: {formatFirebaseTimestamp(video.processedAt)}</p>

                                    {/* button action to be implemented */}
                                    <button onClick={handleDMCA}>Generate DMCA</button>
                                </div>
                            </li>
                        ))
                    ) : (
                        <p>No processed videos available.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Processed;
