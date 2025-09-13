import express from "express";
import cors from "cors";
import health from "./routes/health";
import api from "./routes/index";
import { connectMongo } from "./infra/db/mongoose";

const app = express();

/* ---------- CORS ---------- */
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

/* ---------- Parsers ---------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ---------- Diagnostics ---------- */
app.get("/__ping", (_req, res) => res.status(200).send("All is operational."));

/* ---------- Root banner ---------- */
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "campuslearn-api",
    version: process.env.npm_package_version ?? "unknown",
  });
});

/* Database connection call */
export async function boot() {
  await connectMongo();
}

/* Silence favicon console noise */
app.get("/favicon.ico", (_req, res) => res.status(204).end());

/* ---------- Routes ---------- */
app.use("/health", health); // GET /health -> { ok: true }
app.use("/api", api); // GET /api/v1/ping -> { ok: true }

/* ---------- 404 (last) ---------- */
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

export default app;
