const admin = require("firebase-admin");
const db = admin.firestore();

const getProcessedVideo = async (req, res) => {
  try {
    const videoSnapshot = await db.collection("processed_videos").get();
    
    if (videoSnapshot.empty) {
      return res.status(404).json({ error: "No processed videos found" });
    }

    const videos = videoSnapshot.docs.map(doc => {
      const data = doc.data();
      const copyPercentage = data.copy_percentage || 0;
      
      // Process timestamps to ensure they have proper start and end times
      let processedTimestamps = [];
      if (data.timestamps && Array.isArray(data.timestamps)) {
        processedTimestamps = data.timestamps.map(timestamp => {
          // Handle case where start and end might be the same (single point detection)
          const start = timestamp.start || "00:00:00";
          let end = timestamp.end || start;
          
          // If start and end are the same, add a small duration (1 second)
          if (start === end) {
            const [hours, minutes, seconds] = start.split(':').map(Number);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const endSeconds = totalSeconds + 1; // Add 1 second
            const endHours = Math.floor(endSeconds / 3600);
            const endMins = Math.floor((endSeconds % 3600) / 60);
            const endSecs = endSeconds % 60;
            end = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:${endSecs.toString().padStart(2, '0')}`;
          }
          
          return {
            start,
            end,
            duration: timestamp.duration || calculateDuration(start, end)
          };
        });
      }

      return {
        videoId: doc.id,
        copied: copyPercentage > 40,
        copyPercentage,
        processedAt: data.processed_at || "Unknown",
        timestamps: processedTimestamps,
        videoIdFirebase: data.video_id || doc.id,
        status: data.status || "completed",
        totalDuration: data.total_duration || 300 // Default 5 minutes if not specified
      };
    });

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching processed videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to calculate duration between two timestamps
const calculateDuration = (start, end) => {
  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };
  
  const startSeconds = timeToSeconds(start);
  const endSeconds = timeToSeconds(end);
  return Math.max(endSeconds - startSeconds, 1); // Minimum 1 second duration
};

module.exports = { getProcessedVideo };