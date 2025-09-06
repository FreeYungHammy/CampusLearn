import { Router } from "express";
import users from "../modules/users";
import students from "../modules/students";
import tutors from "../modules/tutors";
import files from "../modules/files";
import chat from "../modules/chat";
import health from "./health";

const r = Router();

r.use("/health", health);
r.use("/users", users);
r.use("/students", students);
r.use("/tutors", tutors);
r.use("/files", files);
r.use("/chat", chat);
r.get("/v1/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default r;
