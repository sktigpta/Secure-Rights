require("dotenv").config();
const cors = require("cors");
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Import Firebase config (ensure it loads first)
require("./config/firebase");

// Load environment variables
const frontendUrl = process.env.frontend_URL || "http://localhost";
const frontendPort = process.env.frontend_PORT || 3000;

const youtubeRoutes = require("./routes/youtubeRoutes");
const searchQueriesRoute = require("./routes/searchQueries");
const gettingPermissionIds = require("./routes/permissionRoutes");
const processedRoutes = require("./routes/processedRoutes");
const dmcaRoutes = require("./routes/dmcaRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: [
        `${frontendUrl}`,  // Production (Vercel)
        `http://localhost:${frontendPort}` // Local development
    ],
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

const io = new Server(server, {
    cors: { origin: [`${frontendUrl}`, `http://localhost:${frontendPort}`] }
});

let aiProcess = null;

const runCommand = (command, workingDir = path.join(__dirname, "..")) => {
    const { exec } = require("child_process");
    const process = exec(command, { cwd: workingDir });

    process.stdout.on("data", (data) => {
        console.log(data);
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (line.startsWith("PROGRESS_JSON:")) {
                try {
                    const jsonStr = line.substring("PROGRESS_JSON:".length);
                    const progressData = JSON.parse(jsonStr);
                    io.emit("progress-data", progressData);
                } catch (e) {
                    console.error("Error parsing progress JSON:", e);
                }
            } else if (line.trim()) {
                io.emit("terminal-output", line);
            }
        }
    });

    process.stderr.on("data", (data) => {
        console.error(data);
        io.emit("terminal-output", data);
    });

    process.on("close", (code) => {
        io.emit("terminal-output", `Process exited with code ${code}`);
        aiProcess = null;
    });

    return process;
};

app.get("/start-ai", (req, res) => {
    if (aiProcess) {
        return res.status(400).json({ error: "AI server is already running." });
    }

    const aiPath = path.join(__dirname, "../ai");

    const command = process.platform === "win32"
        ? `.venv\\Scripts\\activate && python main.py`
        : `source .venv/bin/activate && python main.py`;

    aiProcess = runCommand(command, aiPath);
    res.json({ message: "AI server started..." });
});

app.get("/stop-ai", (req, res) => {
    if (aiProcess) {
        aiProcess.kill();
        aiProcess = null;
        res.json({ message: "AI server stopped..." });
    } else {
        res.status(400).json({ error: "AI server is not running." });
    }
});

app.get("/ai-status", (req, res) => {
    res.json({ running: aiProcess !== null });
});

app.use("/api/youtube", youtubeRoutes);
app.use("/api/search-queries", searchQueriesRoute);
app.use("/api/permissions", gettingPermissionIds);
app.use("/api/processed", processedRoutes);
app.use("/api/dmca", dmcaRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
