require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Firebase Initialization
require("./config/firebase.js");

const app = express();

// Setup Temporary Upload Directory for Vercel
const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
console.log("Temporary upload directory created:", uploadsDir);

// CORS Configuration
const allowedOrigins = [
  `http://localhost:${process.env.FRONTEND_PORT}`,
  process.env.SECONDARY_FRONTEND_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Serve files from /tmp/uploads (only for internal or debug, not permanent hosting)
app.use("/uploads", express.static(uploadsDir));

// Import Routes
const youtubeRoutes = require("./routes/youtubeRoutes.js");
const searchQueriesRoute = require("./routes/searchQueries.js");
const gettingPermissionIds = require("./routes/permissionRoutes.js");
const processedRoutes = require("./routes/processedRoutes.js");
const dmcaRoutes = require("./routes/dmcaRoutes.js");
const authRoutes = require("./routes/authRoutes.js");

// Mount Routes
app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);
app.use("/api/auth", authRoutes);

// Export for Vercel Serverless Functions
module.exports = app;
