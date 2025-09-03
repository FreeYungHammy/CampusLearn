import { Router } from "express";
const r = Router();

// test endpoint
r.get("/v1/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default r;
