import express from "express";
import cors from "cors";
import health from "./routes/health.js";
import api from "./routes/index.js";

const app = express();

// --- CORS (before routes)
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowed.length
      ? allowed
      : ["http://localhost:5173", "http://localhost:8080"],
    credentials: true,
  }),
);

// --- Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Routes
app.use("/health", health); // 200 OK for container health checks
app.use("/api", api); // your main API lives under /api

// --- 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

export default app;
