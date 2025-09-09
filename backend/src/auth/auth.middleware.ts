import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt";

export type AuthedRequest = Request & {
  user?: { id: string; email: string; role: string };
};

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];

  if (!auth || Array.isArray(auth)) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Invalid Authorization header" });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = { id: payload.id, email: payload.email, role: payload.role };
  next();
}

export function requireTutor(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "tutor") {
      return res.status(403).json({ message: "Tutor role required" });
    }
    next();
  });
}
