import bcrypt from "bcrypt";
import { signJwt } from "../../auth/jwt";
import { UserRepo } from "./user.repo";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";
import type { UserDoc } from "../../schemas/user.schema";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ALLOWED_EMAIL_DOMAIN = "@student.belgiumcampus.ac.za";

// Read the base64 string from default.txt (sync since it's only once on startup)
const defaultPfpBase64 = fs
  .readFileSync(path.join(__dirname, "default.txt"), "utf-8")
  .trim();

const defaultPfp = {
  data: Buffer.from(defaultPfpBase64, "base64"),
  contentType: "png",
};

export const UserService = {
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

    // Fetch the user's profile to get their name
    let profile: any;
    if (user.role === "student") {
      profile = await StudentRepo.findOne({ userId: (user as any)._id });
    } else if (user.role === "tutor") {
      profile = await TutorRepo.findOne({ userId: (user as any)._id });
    }

    const { passwordHash: _ph, ...publicUser } = user as any;

    // Combine user and profile data
    const userWithProfile = {
      ...publicUser,
      id: user._id.toString(), // Explicitly add the 'id' property
      name: profile?.name,
      surname: profile?.surname,
      pfp: profile?.pfp,
      subjects: profile?.subjects, // For tutors
      enrolledCourses: profile?.enrolledCourses, // For students
    };

    return { token, user: userWithProfile };
  },

  async updatePfp(userId: string, pfp: string) {
    const user = await UserRepo.findById(userId);
    if (!user) throw new Error("User not found");

    const [meta, data] = pfp.split(",");
    const contentType = meta.split(";")[0].split(":")[1];

    const pfpData = {
      data: Buffer.from(data, "base64"),
      contentType,
    };

    if (user.role === "student") {
      await StudentRepo.update({ userId }, { pfp: pfpData });
    } else if (user.role === "tutor") {
      await TutorRepo.update({ userId }, { pfp: pfpData });
    }
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
      // Still return a success message to prevent email enumeration
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    await UserRepo.updateById(user._id, {
      $set: {
        resetPasswordToken: passwordResetToken,
        resetPasswordExpires: passwordResetExpires,
      },
    });

    // In a real app, you would send an email with the resetToken
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
