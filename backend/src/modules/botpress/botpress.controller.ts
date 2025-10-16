import { Request, Response, NextFunction } from "express";
import { BotpressService } from "./botpress.service";
import { createHmac } from "crypto";
import { Types } from "mongoose";
import { requireAuth } from "../../auth/auth.middleware";

export const BotpressController = {
  getConfig: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = BotpressService.getConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  },

  sendMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, userId } = req.body;

      if (!message || !userId) {
        return res.status(400).json({
          error: "Message and userId are required",
        });
      }

      console.log(
        `Botpress request - Message: "${message}", UserId: "${userId}"`,
      );
      const response = await BotpressService.sendMessage(message, userId);
      console.log(`Botpress response:`, response);

      res.json(response);
    } catch (error) {
      console.error("Botpress controller error:", error);
      next(error);
    }
  },

  mintClaim: [
    requireAuth, // Apply auth guard
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const secret = process.env.BOTPRESS_CLAIM_SECRET;
        if (!secret) {
          return res
            .status(500)
            .json({ error: "Missing BOTPRESS_CLAIM_SECRET" });
        }

        const u: any = (req as any).user;
        const uid = String(u._id ?? u.id);
        const role = String(u.role ?? "student");

        const claims = { uid, role, ts: Date.now(), ver: 1 };
        const b64 = Buffer.from(JSON.stringify(claims)).toString("base64url");
        const sig = createHmac("sha256", secret).update(b64).digest("hex");

        return res.json({ token: `${b64}.${sig}` });
      } catch (err) {
        next(err);
      }
    },
  ],

  forwardClaim: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId, token } = req.body || {};
      if (!conversationId || !token) {
        return res
          .status(400)
          .json({ error: "Missing conversationId or token" });
      }

      const botId = process.env.BOTPRESS_BOT_ID;
      const pat = process.env.BOTPRESS_PAT;
      if (!botId || !pat) {
        return res.status(500).json({ error: "Botpress credentials missing" });
      }

      const url = `https://api.botpress.cloud/v1/bots/${botId}/conversations/${conversationId}/messages`;
      const headers: HeadersInit = {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      };

      const bpRes = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "text", text: `🔐 ROLE-CLAIM ${token}` }),
      });

      if (!bpRes.ok) {
        const detail = await bpRes.text().catch(() => "");
        return res
          .status(502)
          .json({
            error: `Botpress API ${bpRes.status}`,
            detail: detail || undefined,
          });
      }

      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  testConfig: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = BotpressService.getConfig();
      res.json({
        ...config,
        hasClientId: !!config.clientId,
        hasBotId: !!config.botId,
        clientIdLength: config.clientId?.length || 0,
        botIdLength: config.botId?.length || 0,
      });
    } catch (error) {
      next(error);
    }
  },
};
