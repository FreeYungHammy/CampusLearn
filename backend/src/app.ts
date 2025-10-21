import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import rateLimit from "express-rate-limit";
import health from "./routes/health";
import api from "./routes/index";
import { connectMongo } from "./infra/db/mongoose";
import { env } from "./config/env";
import EnvironmentValidator from "./utils/envValidator";

const app = express();
const server = http.createServer(app);
app.disable("etag");

/* ---------- Upload Rate Limiting - Disabled for Hosted Environment ---------- */
// Upload rate limiting removed for hosted environment - no artificial limits on video/file uploads

/* ---------- CORS ---------- */
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigins = allowed.length ? allowed : env.corsOrigins;
console.log("🌐 CORS Configuration:");
console.log("  - Environment CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("  - Allowed origins:", corsOrigins);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (corsOrigins.includes(origin as string)) {
    res.header('Access-Control-Allow-Origin', origin as string);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } else {
    res.sendStatus(403); // Reject unauthorized origins
  }
});

/* ---------- Parsers ---------- */
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// No video-specific size limits for hosted environment

/* ---------- Diagnostics ---------- */
app.get("/__ping", (_req, res) => res.status(200).send("All is operational."));

/* ---------- Root banner ---------- */
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "campuslearn-api",
    version: process.env.VERSION ?? "unknown",
  });
});

/* Database connection call */
export async function boot() {
  // Validate environment configuration
  console.log("🔍 Validating environment configuration...");
  const envValidation = EnvironmentValidator.validate();
  EnvironmentValidator.logValidationResults(envValidation);
  
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed. Please check your .env file.");
    console.error("Missing required variables:", envValidation.missing.join(", "));
    process.exit(1);
  }
  
  await connectMongo();
}

/* Silence favicon console noise */
app.get("/favicon.ico", (_req, res) => res.status(204).end());

/* ---------- Routes ---------- */
app.use("/health", health); // GET /health -> { ok: true }
// No upload rate limiting applied for hosted environment
app.use("/api", api); // GET /api/v1/ping -> { ok: true }

/* ---------- 404 (last) ---------- */
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

export { app, server };
