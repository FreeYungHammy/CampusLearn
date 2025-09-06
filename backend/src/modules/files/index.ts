import { Router } from "express";
import { FileController } from "./file.controller";

const r = Router();
r.post("/", FileController.create);
r.get("/", FileController.list);
r.get("/:id", FileController.getMeta);
r.get("/:id/binary", FileController.getBinary);
r.patch("/:id", FileController.update);
r.delete("/:id", FileController.remove);

export default r;
