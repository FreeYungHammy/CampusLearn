import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt";
import { CacheService } from "../services/cache.service";

const JWT_BLACKLIST_KEY = (token: string) => `jwt:blacklist:${token}`;

export type AuthedRequest = Request & {
  user?: { id: string; email: string; role: string };
};

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  let auth = req.headers["authorization"] || req.headers["Authorization"];

  // Fallback: support token via query param for iframe/file src access
  if ((!auth || Array.isArray(auth)) && typeof req.query.token === "string") {
    auth = `Bearer ${req.query.token}`;
  }

  if (!auth || Array.isArray(auth)) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const [scheme, token] = (auth as string).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Invalid Authorization header" });
  }

  // Check if token is blacklisted (use debug logging to reduce noise)
  const isBlacklisted = await CacheService.get(JWT_BLACKLIST_KEY(token), 'debug');
  if (isBlacklisted) {
    return res.status(401).json({ message: "Token has been revoked" });
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
  if (req.user?.role !== "tutor") {
    console.log(`requireTutor: Access denied. User role: ${req.user?.role}, required: tutor`);
    return res.status(403).json({ message: "Tutor role required" });
  }
  // Remove successful access logging to reduce noise
  next();
}

export function requireStudent(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "student") {
    return res.status(403).json({ message: "Student role required" });
  }
  next();
}

export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin role required" });
  }
  next();
}
