import { Router } from "express";
import users from "../modules/users";
import students from "../modules/students";
import tutors from "../modules/tutors";
import files from "../modules/files";
import chat from "../modules/chat";
import forum from "../modules/forum";
import subscriptions from "../modules/subscriptions";
import bookings from "../modules/bookings";
import botpress from "../modules/botpress";
import admin from "../modules/admin";
import health from "./health";
import { videoRoutes } from "../modules/video";

const r = Router();

r.get("/", (_req, res) => {
  res.json({ ok: true, root: "/api" });
});

r.use("/health", health);
r.use("/users", users);
r.use("/students", students);
r.use("/tutors", tutors);
r.use("/files", files);
r.use("/chat", chat);
r.use("/forum", forum);
r.use("/subscriptions", subscriptions);
r.use("/bookings", bookings);
r.use("/botpress", botpress);
r.use("/videos", videoRoutes);
r.use("/admin", admin);
r.get("/v1/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default r;
