require("dotenv").config();
const cors = require("cors");
const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Import Firebase config (ensure it loads first)
require("./config/firebase");

const youtubeRoutes = require("./routes/youtubeRoutes");
const searchQueriesRoute = require("./routes/searchQueries");
const gettingPermissionIds = require("./routes/permissionRoutes");
const processedRoutes = require("./routes/processedRoutes.js");
const dmcaRoutes = require("./routes/dmcaRoutes.js")

// Construct primary frontend URL using FRONTEND_PORT
const primaryFrontendUrl = `http://localhost:${process.env.FRONTEND_PORT}`;
const secondaryFrontendUrl = process.env.SECONDARY_FRONTEND_URL;

const allowedOrigins = [primaryFrontendUrl, secondaryFrontendUrl];

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    }
});

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
}));

app.use(express.json());


// Routes
app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);


// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
