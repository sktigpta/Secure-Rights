require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import Firebase config
require("./config/firebase.js");

// Import Routes
const youtubeRoutes = require("./routes/youtubeRoutes.js");
const searchQueriesRoute = require("./routes/searchQueries.js");
const gettingPermissionIds = require("./routes/permissionRoutes.js");
const processedRoutes = require("./routes/processedRoutes.js");
const dmcaRoutes = require("./routes/dmcaRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const connectDB = require("./config/db.js");

const app = express();

// CORS Configuration
const allowedOrigins = [
  `http://localhost:3000`,
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
    methods: "GET,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);
app.use("/api/auth",authRoutes)
// Export the app for Vercel's serverless functions
// module.exports = app;

app.listen(5000,()=>{
  connectDB();
  console.log("server started on port: ",5000);
})