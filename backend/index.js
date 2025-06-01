require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Import Firebase config
require("./config/firebase.js");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Import Routes
const youtubeRoutes = require("./routes/youtubeRoutes.js");
const searchQueriesRoute = require("./routes/searchQueries.js");
const gettingPermissionIds = require("./routes/permissionRoutes.js");
const processedRoutes = require("./routes/processedRoutes.js");
const dmcaRoutes = require("./routes/dmcaRoutes.js");
const authRoutes = require("./routes/authRoutes.js");

const app = express();
console.log(process.env.FRONTEND_PORT)
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

// Routes
app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);
app.use("/api/auth", authRoutes);  // Authentication routes

// Export the app for Vercel's serverless functions
module.exports = app;

// if (process.env.NODE_ENV !== "production") {
//   app.listen(5000, () => {
//     console.log("Server running locally on http://localhost:5000");
//   });
// } else {
//   module.exports = app;
// }
