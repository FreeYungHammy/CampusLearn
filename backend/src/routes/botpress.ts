// backend/src/routes/botpress.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose, { Schema, Model, Types } from "mongoose";
import { createHmac } from "crypto";
// at top of routes/botpress.ts
import { requireAuth } from "../auth/auth.middleware"; // <— adjust path to your real one

const router = express.Router();

/* ────────────────────────────────────────────────────────────────────────────
   Model: BotpressSession
   ──────────────────────────────────────────────────────────────────────────── */
interface IBotpressSession {
  conversationId: string;
  userId: string; // stringified ObjectId
  role: "student" | "tutor" | "admin" | string;
  createdAt: Date;
}

const BotpressSessionSchema = new Schema<IBotpressSession>(
  {
    conversationId: { type: String, index: true, unique: true, required: true },
    userId: { type: String, index: true, required: true },
    role: { type: String, index: true, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "botpress_sessions" },
);

const BotpressSession: Model<IBotpressSession> =
  (mongoose.models.BotpressSession as Model<IBotpressSession>) ||
  mongoose.model<IBotpressSession>("BotpressSession", BotpressSessionSchema);

// These must exist in your codebase already:
const Message = mongoose.model("Message"); // your existing message schema
const User = mongoose.model("User"); // your existing user schema

/* ────────────────────────────────────────────────────────────────────────────
   Helpers & Guards
   ──────────────────────────────────────────────────────────────────────────── */
function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== process.env.BOTPRESS_INTERNAL_TOKEN) {
    return res.status(401).json({ error: "Unauthorized (internal token)" });
  }
  return next();
}

function deriveRole(u: any): string {
  if (!u) return "unknown";
  return (
    u.role ??
    u.userType ??
    u.accountType ??
    (u.isTutor ? "tutor" : u.isAdmin ? "admin" : "student")
  );
}

function buildChatId(a: string, b: string) {
  return [String(a), String(b)].sort().join("-");
}

// Claim format: base64url(payload).hex(hmac)
function signClaim(payload: object, secret: string) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

function verifyClaim(
  token: string,
  secret: string,
): { uid: string; role: string; ts: number; ver?: number } | null {
  const [b64, sigHex] = String(token || "").split(".");
  if (!b64 || !sigHex) return null;
  const expect = createHmac("sha256", secret).update(b64).digest("hex");
  if (expect !== sigHex) return null;
  try {
    const obj = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!obj?.uid || !obj?.role) return null;
    return obj;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   0) Probe (debug)
   GET /api/botpress/_probe
   ──────────────────────────────────────────────────────────────────────────── */
router.get("/_probe", (_req, res) =>
  res.json({ ok: true, router: "routes/botpress" }),
);

/* ────────────────────────────────────────────────────────────────────────────
   1) Mint claim (App → Backend; user is logged in)
   POST /api/botpress/mint-claim
   returns { token }
   ──────────────────────────────────────────────────────────────────────────── */
router.post("/mint-claim", requireAuth, async (req: Request, res: Response) => {
  try {
    const secret = process.env.BOTPRESS_CLAIM_SECRET;
    if (!secret)
      return res.status(500).json({ error: "Missing BOTPRESS_CLAIM_SECRET" });

    const u: any = (req as any).user;
    const uid = String(u._id ?? u.id);
    const role = deriveRole(u);

    const token = signClaim({ uid, role, ts: Date.now(), ver: 1 }, secret);
    return res.json({ token });
  } catch (err: any) {
    console.error("mint-claim error:", err?.message || err);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   1b) Forward claim (App → Backend, using user token)
   POST /api/botpress/forward-claim
   body: { conversationId, token (claim) }
   ──────────────────────────────────────────────────────────────────────────── */
router.post(
  "/forward-claim",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, token } = req.body || {};
      if (!conversationId || !token) {
        return res
          .status(400)
          .json({ error: "conversationId and token required" });
      }
      const secret = process.env.BOTPRESS_CLAIM_SECRET;
      if (!secret)
        return res.status(500).json({ error: "Missing BOTPRESS_CLAIM_SECRET" });

      const claim = verifyClaim(token, secret);
      if (!claim) return res.status(400).json({ error: "Invalid claim token" });

      // Security check: ensure the user ID in the claim matches the logged-in user
      const u: any = (req as any).user;
      const jwtUserId = String(u.id);
      const claimUserId = String(claim.uid);

      console.log(
        `[forward-claim] Comparing IDs: JWT User ID: ${jwtUserId}, Claim UID: ${claimUserId}`,
      );

      if (jwtUserId !== claimUserId) {
        console.error(
          `[forward-claim] User ID mismatch. JWT(u.id): ${jwtUserId}, Claim(claim.uid): ${claimUserId}`,
        );
        return res.status(403).json({ error: "Claim-user mismatch" });
      }

      console.log(
        `[forward-claim] Saving session with conversationId: ${conversationId}`,
      );
      await BotpressSession.updateOne(
        { conversationId },
        {
          $set: {
            conversationId,
            userId: String(claim.uid),
            role: String(claim.role),
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      return res.json({
        ok: true,
        userId: String(claim.uid),
        role: String(claim.role),
      });
    } catch (err: any) {
      console.error("forward-claim error:", err?.message || err);
      return res.status(500).json({ error: "Internal error" });
    }
  },
);

/* ────────────────────────────────────────────────────────────────────────────
   2) Attach session (Botpress → Backend, using internal token)
   POST /api/botpress/attach-session
   body: { conversationId, token }
   ──────────────────────────────────────────────────────────────────────────── */
router.post(
  "/attach-session",
  requireInternalToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, token } = req.body || {};
      if (!conversationId || !token) {
        return res
          .status(400)
          .json({ error: "conversationId and token required" });
      }
      const secret = process.env.BOTPRESS_CLAIM_SECRET;
      if (!secret)
        return res.status(500).json({ error: "Missing BOTPRESS_CLAIM_SECRET" });

      const claim = verifyClaim(token, secret);
      if (!claim) return res.status(400).json({ error: "Invalid claim token" });

      await BotpressSession.updateOne(
        { conversationId },
        {
          $set: {
            conversationId,
            userId: String(claim.uid),
            role: String(claim.role),
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      return res.json({
        ok: true,
        userId: String(claim.uid),
        role: String(claim.role),
      });
    } catch (err: any) {
      console.error("attach-session error:", err?.message || err);
      return res.status(500).json({ error: "Internal error" });
    }
  },
);

/* ────────────────────────────────────────────────────────────────────────────
   3) Resolve mapping (debug helper)
   POST /api/botpress/resolve { conversationId }
   ──────────────────────────────────────────────────────────────────────────── */
router.post(
  "/resolve",
  requireInternalToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.body || {};
      if (!conversationId)
        return res.status(400).json({ error: "conversationId required" });

      const sess = await BotpressSession.findOne({ conversationId })
        .lean<IBotpressSession>()
        .exec();
      return res.json({
        userId: sess?.userId || null,
        role: sess?.role || null,
      });
    } catch (err: any) {
      console.error("resolve error:", err?.message || err);
      return res.status(500).json({ error: "Internal error" });
    }
  },
);

/* ────────────────────────────────────────────────────────────────────────────
   4) Role check (tutor?)
   POST /api/botpress/check-role { conversationId } -> { allowed: boolean }
   ──────────────────────────────────────────────────────────────────────────── */
router.post(
  "/check-role",
  requireInternalToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.body || {};
      if (!conversationId)
        return res
          .status(400)
          .json({ allowed: false, error: "conversationId required" });

      const sess = await BotpressSession.findOne({ conversationId })
        .lean<IBotpressSession>()
        .exec();
      return res.json({ allowed: sess?.role === "tutor" });
    } catch (err: any) {
      console.error("check-role error:", err?.message || err);
      return res.status(500).json({ allowed: false, error: "Internal error" });
    }
  },
);

/* ────────────────────────────────────────────────────────────────────────────
   5) Broadcast (tutor → all prior chat partners)
   POST /api/botpress/messages/broadcast
   headers: Authorization: Bearer <BOTPRESS_INTERNAL_TOKEN>
   body: { conversationId, message }
   ──────────────────────────────────────────────────────────────────────────── */
router.post("/messages/broadcast", async (req: Request, res: Response) => {
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res
        .status(400)
        .json({ ok: false, sent: 0, error: "message required" });
    }

    // --- DEMO MODE - NO AUTHENTICATION ---
    const HARDCODED_TUTOR_USER_ID = "68d55652f3b98c3827e71a20";

    // 1. Find the Tutor profile from the hardcoded user ID
    const tutorProfile = await mongoose
      .model("Tutor")
      .findOne({ userId: HARDCODED_TUTOR_USER_ID });
    if (!tutorProfile) {
      return res
        .status(404)
        .json({
          ok: false,
          sent: 0,
          error: "Hardcoded tutor profile not found.",
        });
    }
    const tutorId = tutorProfile._id;

    // 2. Find all students subscribed to this tutor
    const subscriptions = await mongoose
      .model("Subscription")
      .find({ tutorId })
      .lean();
    const studentIds = subscriptions.map((s: any) => s.studentId);

    if (studentIds.length === 0) {
      return res.json({
        ok: true,
        sent: 0,
        note: "Tutor has no subscribed students.",
      });
    }

    // 3. Find the user IDs for those students
    const students = await mongoose
      .model("Student")
      .find({ _id: { $in: studentIds } })
      .lean();
    const recipientIds: string[] = students.map((s: any) => String(s.userId));

    if (recipientIds.length === 0) {
      return res.json({
        ok: true,
        sent: 0,
        note: "No subscribed student user accounts found.",
      });
    }

    // 4. Create the message documents
    const clean = String(message).trim();
    const now = new Date();
    const docs = recipientIds.map((rid) => ({
      senderId: HARDCODED_TUTOR_USER_ID,
      receiverId: rid,
      chatId: buildChatId(HARDCODED_TUTOR_USER_ID, rid),
      content: clean,
      messageType: "text",
      seen: false,
      createdAt: now,
      updatedAt: now,
    }));

    await (mongoose.model("Message") as any).insertMany(docs, {
      ordered: false,
    });

    return res.json({ ok: true, sent: recipientIds.length });
  } catch (err: any) {
    console.error("broadcast error:", err?.message || err);
    return res
      .status(500)
      .json({ ok: false, sent: 0, error: "Broadcast failed" });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   6) Dev attach (test helper)
   POST /api/botpress/dev/attach { conversationId, userId, role }
   ──────────────────────────────────────────────────────────────────────────── */
router.post(
  "/dev/attach",
  requireInternalToken,
  async (req: Request, res: Response) => {
    try {
      const { conversationId, userId, role } = req.body || {};
      if (!conversationId || !userId || !role) {
        return res
          .status(400)
          .json({ error: "conversationId, userId, role required" });
      }
      await BotpressSession.updateOne(
        { conversationId },
        {
          $set: {
            conversationId,
            userId: String(userId),
            role: String(role),
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      return res.json({ ok: true, role: String(role) });
    } catch (err: any) {
      console.error("dev/attach error:", err?.message || err);
      return res.status(500).json({ error: "Internal error" });
    }
  },
);

export default router;
