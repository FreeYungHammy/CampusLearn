import { Router } from "express";
import { TutorController } from "./tutors.controller";
import tutorRatingRoutes from "../tutor-ratings";

const r = Router();
r.post("/", TutorController.create);
r.get("/", TutorController.list);
r.get("/by-user/:userId", TutorController.byUser);
r.get("/search", TutorController.searchSubject); // ?q=DBD381
r.get("/:id", TutorController.get);
r.patch("/:id", TutorController.update);
// r.post("/:id/rate", TutorController.rate); // Legacy endpoint - removed to avoid conflict
r.delete("/:id", TutorController.remove);

// New tutor rating routes
r.use("/", tutorRatingRoutes);

export default r;
