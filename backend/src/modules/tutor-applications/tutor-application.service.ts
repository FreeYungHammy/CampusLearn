import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { TutorApplicationModel } from "../../schemas/tutorApplication.schema";
import { UserModel } from "../../schemas/user.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import type { TutorApplicationDoc } from "../../schemas/tutorApplication.schema";

// Define defaultPfp by reading the file from the correct relative path
const defaultPfpBase64 = fs
  .readFileSync(path.join(__dirname, "../users/default.txt"), "utf-8")
  .trim();

const defaultPfp = {
  data: Buffer.from(defaultPfpBase64, "base64"),
  contentType: "png",
};

export const TutorApplicationService = {
  async create(applicationData: any) {
    const { password, ...rest } = applicationData;
    // Hash the password once upon application creation
    const passwordHash = await bcrypt.hash(password, 10);
    return TutorApplicationModel.create({ ...rest, passwordHash });
  },

  async list() {
    return TutorApplicationModel.find().sort({ createdAt: -1 });
  },

  async getById(id: string) {
    return TutorApplicationModel.findById(id);
  },

  async approve(id: string) {
    const application = await TutorApplicationModel.findById(id);
    if (!application) {
      throw new Error("Application not found");
    }

    // Create User using the original, single-hashed password
    const user = await UserModel.create({
      email: application.email,
      passwordHash: application.passwordHash, // No re-hashing
      role: "tutor",
    });

    // Create Tutor with the default PFP
    await TutorModel.create({
      userId: user._id,
      name: application.firstName,
      surname: application.lastName,
      subjects: application.subjects,
      pfp: defaultPfp, // Assign the default PFP
    });

    // Delete Application
    await TutorApplicationModel.findByIdAndDelete(id);

    return { message: "Application approved successfully" };
  },

  async reject(id: string) {
    const result = await TutorApplicationModel.findByIdAndDelete(id);
    if (!result) {
      throw new Error("Application not found");
    }
    return { message: "Application rejected successfully" };
  },
};
