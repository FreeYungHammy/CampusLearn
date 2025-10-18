import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { TutorApplicationModel } from "../../schemas/tutorApplication.schema";
import { UserModel } from "../../schemas/user.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { emailService } from "../../services/email.service";
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
    const application = await TutorApplicationModel.create({ ...rest, passwordHash });
    
    // Send confirmation email to applicant
    try {
      const applicantName = `${applicationData.firstName} ${applicationData.lastName}`;
      const emailSent = await emailService.sendTutorApplicationReceivedEmail(
        applicationData.email, 
        applicantName
      );
      if (emailSent) {
        console.log(`Tutor application received email sent to ${applicationData.email}`);
      } else {
        console.log(`Failed to send tutor application received email to ${applicationData.email}`);
      }
    } catch (error) {
      console.error(`Error sending tutor application received email to ${applicationData.email}:`, error);
      // Continue with application creation even if email fails
    }

    // Send notification email to admins
    try {
      const applicantName = `${applicationData.firstName} ${applicationData.lastName}`;
      // Get all admin emails
      const { AdminModel } = await import("../../schemas/admin.schema");
      const { UserModel } = await import("../../schemas/user.schema");
      
      const adminUsers = await UserModel.find({ role: "admin" }).lean();
      const adminEmails = adminUsers.map(admin => admin.email);
      
      if (adminEmails.length > 0) {
        // Send to all admins
        for (const adminEmail of adminEmails) {
          const adminEmailSent = await emailService.sendTutorApplicationEmail(
            adminEmail,
            applicantName
          );
          if (adminEmailSent) {
            console.log(`Tutor application notification sent to admin: ${adminEmail}`);
          } else {
            console.log(`Failed to send tutor application notification to admin: ${adminEmail}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error sending tutor application notification to admins:`, error);
      // Continue with application creation even if admin notification fails
    }
    
    return application;
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

    // Send approval email to applicant
    try {
      const applicantName = `${application.firstName} ${application.lastName}`;
      const emailSent = await emailService.sendWelcomeEmail(
        application.email,
        applicantName
      );
      if (emailSent) {
        console.log(`Tutor application approval email sent to ${application.email}`);
      } else {
        console.log(`Failed to send tutor application approval email to ${application.email}`);
      }
    } catch (error) {
      console.error(`Error sending tutor application approval email to ${application.email}:`, error);
      // Continue with approval even if email fails
    }

    // Delete Application
    await TutorApplicationModel.findByIdAndDelete(id);

    return { message: "Application approved successfully" };
  },

  async reject(id: string) {
    const application = await TutorApplicationModel.findById(id);
    if (!application) {
      throw new Error("Application not found");
    }

    // Send rejection email to applicant
    try {
      const applicantName = `${application.firstName} ${application.lastName}`;
      const emailSent = await emailService.sendTutorApplicationRejectionEmail(
        application.email,
        applicantName
      );
      if (emailSent) {
        console.log(`Tutor application rejection email sent to ${application.email}`);
      } else {
        console.log(`Failed to send tutor application rejection email to ${application.email}`);
      }
    } catch (error) {
      console.error(`Error sending tutor application rejection email to ${application.email}:`, error);
      // Continue with rejection even if email fails
    }

    // Delete Application
    await TutorApplicationModel.findByIdAndDelete(id);
    return { message: "Application rejected successfully" };
  },
};
