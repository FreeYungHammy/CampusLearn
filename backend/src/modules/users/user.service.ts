import bcrypt from "bcrypt";
import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { UserRepo } from "./user.repo";
import type { UserDoc } from "../../schemas/user.schema";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");

const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) ?? "7d";

function signJwt(payload: object) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const UserService = {
  // Registration: hash password, store user
  async register(input: {
    email: string;
    password: string;
    role: "tutor" | "student";
  }) {
    const existing = await UserRepo.findByEmail(input.email);
    if (existing) throw new Error("User already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await UserRepo.create({
      email: input.email,
      passwordHash,
      role: input.role,
    } as Partial<UserDoc>);

    // don't expose hash
    const { passwordHash: _, ...safe } = created as any;
    return safe;
  },

  // Login: verify password, return token + public user
  async login(input: { email: string; password: string }) {
    const user = await UserRepo.findByEmailWithPassword(input.email);
    if (!user) throw new Error("Invalid credentials");

    const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const token = signJwt({
      sub: String((user as any)._id),
      role: user.role,
      email: user.email,
    });
    // strip sensitive field
    const { passwordHash: _ph, ...publicUser } = user as any;
    return { token, user: publicUser };
  },

  // Basic CRUD pass-throughs
  list() {
    return UserRepo.find({});
  },

  get(id: string) {
    return UserRepo.findById(id);
  },

  async update(id: string, patch: Partial<UserDoc>) {
    // normalize email if provided
    if (patch.email) patch.email = patch.email.toLowerCase();

    // if password provided, hash it into passwordHash
    const p = { ...patch } as any;
    if ((p as any).password) {
      p.passwordHash = await bcrypt.hash((p as any).password, 10);
      delete p.password;
    }
    return UserRepo.updateById(id, { $set: p });
  },

  remove(id: string) {
    return UserRepo.deleteById(id);
  },
};
