import { Router, Request, Response } from "express";

const r = Router();

r.get("/hello", (_req: Request, res: Response) => {
  res.json({ message: "CampusLearn API says hello 👋" });
});

export default r;
