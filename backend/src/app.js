import "dotenv/config"; // loads .env
import express from "express";
import cors from "cors";
import health from "./routes/health.js"; // health route
import api from "./routes/index.js";

const app = express();

// --- CORS (before routes)
const allowed = (process.env.CORS_ORIGIN || "").split(",").filter(Boolean);
// allow localhost during dev even when empty, you can default here:
const corsOptions = {
  origin: allowed.length
    ? allowed
    : ["http://localhost:5173", "http://localhost:8080"],
  credentials: true,
};
app.use(cors(corsOptions));

// --- Body parsers (before routes)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Health route (no auth, no rate limits)
app.use("/health", health); // matches docker-compose curl http://localhost:5000/health

app.use("/api", api);
// --- Example API router (optional)
// import api from "./routes/index.ts";
// app.use("/api", api);

// 404 fallback (optional)
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

export default app;
