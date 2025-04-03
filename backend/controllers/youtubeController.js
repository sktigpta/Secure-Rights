const axios = require("axios");
const admin = require("firebase-admin");

const db = admin.firestore();
const collections = {
  videos: db.collection("youtube_videos"),
  processed: db.collection("processed_videos"),
  permittedChannels: db.collection("permitted_channels"),
  knownChannels: db.collection("known_channels"),
  searchQueries: db.collection("search_queries"),
};

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = 10;

//Function to create missing collections
const createCollectionsIfNotExist = async () => {
  const existingCollections = await db.listCollections();
  const existingNames = existingCollections.map((col) => col.id);

  for (const [key, colRef] of Object.entries(collections)) {
    if (!existingNames.includes(colRef.id)) {
      await colRef.doc("init").set({ createdAt: new Date() });
      console.log(`Created missing collection: ${colRef.id}`);
    }
  }
};

//Get search queries from Firestore
const getSearchQueries = async () => {
  try {
    const snapshot = await collections.searchQueries.get();
    return snapshot.docs.map((doc) => doc.data().query);
  } catch (error) {
    console.error("Error fetching search queries:", error.message);
    return [];
  }
};

//Check if a video has already been processed
const isVideoProcessed = async (videoId) => {
  const doc = await collections.processed.doc(videoId).get();
  return doc.exists;
};

//Get permitted and known channels
const getPermittedChannels = async () => {
  const snapshot = await collections.permittedChannels.get();
  return new Set(snapshot.docs.map((doc) => doc.id));
};

const getKnownChannels = async () => {
  const snapshot = await collections.knownChannels.get();
  return new Set(snapshot.docs.map((doc) => doc.id));
};

// Fetch YouTube Shorts videos
const getYouTubeVideos = async (req, res) => {
  try {
    await createCollectionsIfNotExist(); // Ensure collections exist

    const searchQueries = await getSearchQueries();
    if (searchQueries.length === 0) {
      return res.status(400).json({ error: "No search queries found" });
    }

    const permittedChannels = await getPermittedChannels();
    const knownChannels = await getKnownChannels();
    let allVideos = [];

    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - 1); // Fetch videos from the last 24 hours

    for (const query of searchQueries) {
      console.log(`Searching YouTube for: "${query}"`);

      const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          q: query,
          maxResults: MAX_RESULTS,
          order: "date",
          type: "video",
          publishedAfter: publishedAfter.toISOString(),
          key: YOUTUBE_API_KEY,
        },
      });

      const videoIds = response.data.items.map(video => video.id.videoId);
      if (videoIds.length === 0) continue;

      // Fetch video details to check duration and aspect ratio
      const videoDetailsResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
          part: "contentDetails,snippet",
          id: videoIds.join(","),
          key: YOUTUBE_API_KEY,
        },
      });

      const shortsVideos = videoDetailsResponse.data.items.filter(video => {
        const duration = video.contentDetails.duration;
        const isShort = /^PT([0-5]?[0-9]S|1M)$/.test(duration); // Duration <= 60s
        return isShort;
      });

      const filteredVideos = shortsVideos.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        query,
      }));

      for (const video of filteredVideos) {
        if (permittedChannels.has(video.channelId)) {
          console.log(`Skipping permitted channel: ${video.channelTitle} (${video.channelId})`);
          continue;
        }

        if (knownChannels.has(video.channelId)) {
          console.log(`Skipping known channel: ${video.channelTitle} (${video.channelId})`);
          continue;
        }

        allVideos.push(video);
      }
    }

    await saveVideoMetadata(allVideos);
    res.status(200).json({ message: "New Shorts fetched and saved", videos: allVideos });
  } catch (error) {
    console.error("Error fetching YouTube Shorts:", error.message);
    res.status(500).json({ error: "Failed to fetch YouTube Shorts" });
  }
};

//Save video metadata in Firestore
const saveVideoMetadata = async (videoList) => {
  const batch = db.batch();
  let savedCount = 0;

  for (const video of videoList) {
    const videoRef = collections.videos.doc(video.videoId);

    if (await isVideoProcessed(video.videoId)) {
      console.log(`Skipping already processed video: ${video.videoId}`);
      continue;
    }

    const doc = await videoRef.get();
    if (!doc.exists) {
      batch.set(videoRef, video);
      console.log(`Saving new video: ${video.title} (ID: ${video.videoId})`);
      savedCount++;
    }
  }

  await batch.commit();
  console.log(`${savedCount} new videos saved successfully!`);
};

const getStoredVideos = async (req, res) => {
  try {
    const snapshot = await collections.videos.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: "No videos found" });
    }

    const videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching stored videos:", error.message);
    res.status(500).json({ error: "Failed to retrieve videos" });
  }
};

module.exports = { getYouTubeVideos , getStoredVideos};
