import bcrypt from "bcrypt";
import { signJwt } from "../../auth/jwt";
import { UserRepo } from "./user.repo";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";
import type { UserDoc } from "../../schemas/user.schema";

const ALLOWED_EMAIL_DOMAIN = "@student.belgiumcampus.ac.za";

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
      });
    } else if (input.role === "tutor") {
      await TutorRepo.create({
        userId: user._id,
        name: input.firstName,
        surname: input.lastName,
        subjects: input.subjects,
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
      name: profile?.name,
      surname: profile?.surname,
    };

    return { token, user: userWithProfile };
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
};
