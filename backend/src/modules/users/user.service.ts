import bcrypt from "bcrypt";
import { signJwt, verifyJwt } from "../../auth/jwt";
import { UserRepo } from "./user.repo";
import { StudentRepo } from "../students/student.repo";
import { StudentService } from "../students/student.service";
import { TutorRepo } from "../tutors/tutor.repo";
import type { UserDoc } from "../../schemas/user.schema";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CacheService } from "../../services/cache.service";
import { HttpException } from "../../infra/http/HttpException";
import { createLogger } from "../../config/logger";
import { io } from "../../config/socket";

const logger = createLogger("UserService");
const sharp = require('sharp');

const ALLOWED_EMAIL_DOMAIN = "@student.belgiumcampus.ac.za";

const defaultPfpBase64 = fs
  .readFileSync(path.join(__dirname, "default.txt"), "utf-8")
  .trim();

const defaultPfp = {
  data: Buffer.from(defaultPfpBase64, "base64"),
  contentType: "png",
};

const JWT_BLACKLIST_KEY = (token: string) => `jwt:blacklist:${token}`;

export const UserService = {
  async getProfileByRole(profileId: string, role: "student" | "tutor") {
    if (role === "student") {
      return StudentRepo.findById(profileId);
    } else if (role === "tutor") {
      return TutorRepo.findById(profileId);
    }
    return null;
  },

  async logout(token: string) {
    const decoded = verifyJwt(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return; // Invalid token or no expiry
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - nowInSeconds;

    if (expiresIn > 0) {
      await CacheService.set(
        JWT_BLACKLIST_KEY(token),
        "blacklisted",
        expiresIn,
      );
    }
  },

  async register(input: {
    email: string;
    password: string;
    role: "tutor" | "student";
    firstName: string;
    lastName: string;
    subjects: string[];
  }) {
    // 1. Validate email domain
    if (!input.email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      const err = new Error(
        `Invalid email domain. Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed.`,
      );
      err.name = "BadRequest";
      throw err;
    }

    // 2. Check for duplicate email
    const existing = await UserRepo.findByEmail(input.email);
    if (existing) {
      const err = new Error("User with this email already exists");
      err.name = "Conflict";
      throw err;
    }

    // 3. Create User
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await UserRepo.create({
      email: input.email,
      passwordHash,
      role: input.role,
    } as Partial<UserDoc>);

    // 4. Create Student or Tutor Profile
    if (input.role === "student") {
      await StudentRepo.create({
        userId: user._id,
        name: input.firstName,
        surname: input.lastName,
        enrolledCourses: input.subjects,
        pfp: defaultPfp,
      });
      // Invalidate student cache on registration
      await StudentService.invalidateCache(user._id.toString());
    } else if (input.role === "tutor") {
      await TutorRepo.create({
        userId: user._id,
        name: input.firstName,
        surname: input.lastName,
        subjects: input.subjects,
        pfp: defaultPfp,
      });
    }

    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  },

  async login(input: { email: string; password: string }) {
    const user = await UserRepo.findByEmailWithPassword(input.email);
    if (!user) throw new Error("Invalid credentials");

    const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const token = signJwt({
      id: String((user as any)._id),
      role: user.role,
      email: user.email,
    });

    let profile: any;
    if (user.role === "student") {
      profile = await StudentRepo.findOne({ userId: (user as any)._id });
    } else if (user.role === "tutor") {
      profile = await TutorRepo.findOne({ userId: (user as any)._id });
    }

    const { passwordHash: _ph, ...publicUser } = user as any;

    const userWithProfile = {
      ...publicUser,
      id: user._id.toString(),
      name: profile?.name,
      surname: profile?.surname,
      pfp: profile?.pfp
        ? {
            contentType: profile.pfp.contentType,
            data: profile.pfp.data.toString("base64"),
          }
        : undefined,
      subjects: profile?.subjects,
      enrolledCourses: profile?.enrolledCourses,
    };

    return { token, user: userWithProfile };
  },

  async getPfp(userId: string) {
    const cacheKey = `pfp:user:${userId}`;

    const cachedPfp = await CacheService.get<{ data: string; contentType: string }>(cacheKey);
    if (cachedPfp) {
      if (cachedPfp.data) {
        return {
          ...cachedPfp,
          data: Buffer.from(cachedPfp.data, "base64"),
        };
      }
      return null; // Cached null
    }

    const user = await UserRepo.findById(userId);
    if (!user) {
      await CacheService.set(cacheKey, null, 300);
      return null;
    }

    let profile: { pfp?: { data: Buffer; contentType: string } } | null = null;
    if (user.role === "student") {
      profile = await StudentRepo.findOne({ userId: user._id }, { pfp: 1 });
    } else if (user.role === "tutor") {
      profile = await TutorRepo.findOne({ userId: user._id }, { pfp: 1 });
    }

    const pfp = profile?.pfp || null;

    console.log("PFP object before caching:", pfp);

    if (pfp && pfp.data) {
      const pfpToCache = {
        ...pfp,
        data: pfp.data.toString("base64"),
      };
      await CacheService.set(cacheKey, pfpToCache, 1800);
    } else {
      await CacheService.set(cacheKey, null, 300);
    }

    return pfp;
  },

  async updatePfp(userId: string, pfp: string) {
    const user = await UserRepo.findById(userId);
    if (!user) throw new Error("User not found");

    const [meta, data] = pfp.split(",");
    const contentType = meta.split(";")[0].split(":")[1];

    const ALLOWED_IMAGE_MIME_TYPES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/svg+xml",
    ];

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType)) {
      throw new HttpException(400, `Unsupported image type: ${contentType}. Only JPEG, PNG, GIF, WEBP, BMP, SVG are allowed.`);
    }

    const pfpData = {
      data: Buffer.from(data, "base64"),
      contentType,
    };

    // Resize image using sharp
    try {
      const originalSize = pfpData.data.length;
      const resizedBuffer = await sharp(pfpData.data)
        .resize(250, 250, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
      pfpData.data = resizedBuffer;
      const resizedSize = pfpData.data.length;
      const savedPercentage = ((originalSize - resizedSize) / originalSize) * 100;
      logger.info(`PFP resized: Original size ${originalSize} bytes, Resized size ${resizedSize} bytes. Saved ${savedPercentage.toFixed(2)}%`);
    } catch (error) {
      logger.error("Error resizing PFP:", error);
      // Optionally, throw an error or use original image if resizing fails
      // For now, we'll proceed with the original if resizing fails
    }

    if (user.role === "student") {
      await StudentRepo.update({ userId }, { pfp: pfpData });
      // Invalidate student profile cache
      await StudentService.invalidateCache(userId);
    } else if (user.role === "tutor") {
      await TutorRepo.update({ userId }, { pfp: pfpData });
      // Invalidate tutor profile cache if it exists
    }

    // Invalidate the main PFP cache for this user
    const cacheKey = `pfp:user:${userId}`;
    await CacheService.del(cacheKey);
    logger.info(`Invalidated PFP cache for user ${userId}`);

    // Emit event to all clients
    io.emit("pfp_updated", { userId, timestamp: Date.now() });
  },

  async updateProfile(userId: string, firstName: string, lastName: string) {
    const user = await UserRepo.findById(userId);
    if (!user) throw new Error("User not found");

    const profileData = {
      name: firstName,
      surname: lastName,
    };

    if (user.role === "student") {
      await StudentRepo.update({ userId }, profileData);
      // Invalidate student cache on update
      await StudentService.invalidateCache(userId);
    } else if (user.role === "tutor") {
      await TutorRepo.update({ userId }, profileData);
    }
  },

  async updatePassword(userId: string, current: string, newPass: string) {
    const user = await UserRepo.findByIdWithPassword(userId);
    if (!user) throw new Error("User not found");

    const ok = await bcrypt.compare(current, (user as any).passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const passwordHash = await bcrypt.hash(newPass, 10);
    await UserRepo.updateById(userId, { $set: { passwordHash } });
  },

  list() {
    return UserRepo.find({});
  },

  get(id: string) {
    return UserRepo.findById(id);
  },

  async update(id: string, patch: Partial<UserDoc>) {
    if (patch.email) patch.email = patch.email.toLowerCase();

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

  async forgotPassword(email: string) {
    const user = await UserRepo.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const passwordResetExpires = new Date(Date.now() + 3600000);

    await UserRepo.updateById(user._id, {
      $set: {
        resetPasswordToken: passwordResetToken,
        resetPasswordExpires: passwordResetExpires,
      },
    });

    console.log(`Password reset token for ${email}: ${resetToken}`);
  },

  async resetPassword(token: string, newPass: string) {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserRepo.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Password reset token is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(newPass, 10);
    await UserRepo.updateById(user._id, {
      $set: {
        passwordHash,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      },
    });
  },
};