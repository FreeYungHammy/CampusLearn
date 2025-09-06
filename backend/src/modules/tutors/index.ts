import { Router } from "express";
import { TutorController } from "./tutors.controller";

const r = Router();
r.post("/", TutorController.create);
r.get("/", TutorController.list);
r.get("/by-user/:userId", TutorController.byUser);
r.get("/search", TutorController.searchSubject); // ?q=DBD381
r.get("/:id", TutorController.get);
r.patch("/:id", TutorController.update);
r.post("/:id/rate", TutorController.rate);
r.delete("/:id", TutorController.remove);

export default r;
