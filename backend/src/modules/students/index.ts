import { Router } from "express";
import { StudentController } from "./students.controller";

const r = Router();
r.post("/", StudentController.create);
r.get("/", StudentController.list);
r.get("/by-user/:userId", StudentController.getByUser);
r.get("/:id", StudentController.get);
r.patch("/:id", StudentController.update);
r.post("/:id/enroll", StudentController.enroll);
r.post("/:id/unenroll", StudentController.unenroll);
r.delete("/:id", StudentController.remove);

export default r;
