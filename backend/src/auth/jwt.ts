import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserDoc } from "../schemas/user.schema";

export type JwtPayload = {
  id: string;
  email: string;
  role: string;
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "30m" });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch (error) {
    return null;
  }
}
