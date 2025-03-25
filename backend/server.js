require("dotenv").config();
const cors = require("cors");
const express = require("express");
const axios = require("axios");
const path = require("path");
const http = require("http");

require("./config/firebase");

const frontendUrl = process.env.FRONTEND_URL || "http://localhost";
const frontendPort = process.env.FRONTEND_PORT || 3000;
const aiServerUrl = process.env.AI_SERVER_URL || "http://your-ai-server.com";

const youtubeRoutes = require("./routes/youtubeRoutes");
const searchQueriesRoute = require("./routes/searchQueries");
const gettingPermissionIds = require("./routes/permissionRoutes");
const processedRoutes = require("./routes/processedRoutes");
const dmcaRoutes = require("./routes/dmcaRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: [frontendUrl, `http://localhost:${frontendPort}`],
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ✅ AI Server Start (Calls External API)
app.get("/start-ai", async (req, res) => {
    try {
        const response = await axios.get(`${aiServerUrl}/start-ai`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to start AI server", details: error.message });
    }
});

// ✅ AI Server Stop (Calls External API)
app.get("/stop-ai", async (req, res) => {
    try {
        const response = await axios.get(`${aiServerUrl}/stop-ai`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to stop AI server", details: error.message });
    }
});

// ✅ AI Server Status Check
app.get("/ai-status", async (req, res) => {
    try {
        const response = await axios.get(`${aiServerUrl}/ai-status`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to get AI status", details: error.message });
    }
});

// API Routes
app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
