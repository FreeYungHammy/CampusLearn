import mongoose from "mongoose";
import { Router } from "express";

const r = Router();

// --- add this guard if you don't already export it from your controller ---
function requireBotpressToken(req: any, res: any, next: any) {
  const h = String(req.headers.authorization || "");
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!tok || tok !== process.env.BOTPRESS_INTERNAL_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- BotpressSession model (same as used in broadcast.service) ---
const BotpressSession =
  mongoose.models.BotpressSession ||
  mongoose.model(
    "BotpressSession",
    new mongoose.Schema(
      {
        conversationId: {
          type: String,
          index: true,
          unique: true,
          required: true,
        },
        userId: { type: String, index: true, required: true },
        role: { type: String, index: true, required: true },
        createdAt: { type: Date, default: Date.now },
      },
      { collection: "botpress_sessions" },
    ),
  );

// DEV ONLY: directly attach a conversation to a user (skip mint-claim)
r.post("/dev/attach", requireBotpressToken, async (req, res) => {
  try {
    const { conversationId, userId, role = "tutor" } = req.body || {};
    if (!conversationId || !userId) {
      return res
        .status(400)
        .json({ ok: false, error: "conversationId and userId required" });
    }
    await BotpressSession.findOneAndUpdate(
      { conversationId },
      {
        conversationId,
        userId: String(userId),
        role: String(role),
        createdAt: new Date(),
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
    return res.json({
      ok: true,
      conversationId,
      userId: String(userId),
      role: String(role),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "attach failed" });
  }
});

export default r;
