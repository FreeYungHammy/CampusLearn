import { Router } from "express";
import { BotpressController } from "./botpress.controller";
import { BotpressWebhookController } from "./botpress.webhook.controller";

const r = Router();

// API endpoints
r.get("/config", BotpressController.getConfig);
r.get("/test", BotpressController.testConfig);
r.post("/message", BotpressController.sendMessage);

// Webhook endpoints for receiving responses from Botpress
r.post("/webhook", BotpressWebhookController.receiveMessage);
r.get("/webhook/health", BotpressWebhookController.webhookHealth);

export default r;
