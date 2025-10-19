import bcrypt from "bcrypt";
import { signJwt, verifyJwt } from "../../auth/jwt";
import { UserRepo } from "./user.repo";
import { StudentRepo } from "../students/student.repo";
import { StudentService } from "../students/student.service";
import { TutorRepo } from "../tutors/tutor.repo";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { AdminModel } from "../../schemas/admin.schema";
import { UserModel } from "../../schemas/user.schema";
import { emailService } from "../../services/email.service";
import type { UserDoc } from "../../schemas/user.schema";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CacheService } from "../../services/cache.service";
import { HttpException } from "../../infra/http/HttpException";
import { createLogger } from "../../config/logger";
import { ChatService } from "../chat/chat.service";
import { io } from "../../config/socket";
import sharp from "sharp";
import { ForumPostModel } from "../../schemas/forumPost.schema";
import { ForumReplyModel } from "../../schemas/forumReply.schema";
import { UserVoteModel } from "../../schemas/userVote.schema";
import { FileModel } from "../../schemas/tutorUpload.schema";
import { VideoModel } from "../../schemas/video.schema";
import { BookingModel } from "../../schemas/booking.schema";
import { SubscriptionModel } from "../../schemas/subscription.schema";
import { gcsService } from "../../services/gcs.service";

const logger = createLogger("UserService");

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
  async getProfileByRole(
    profileId: string,
    role: "student" | "tutor" | "admin",
  ) {
    if (role === "student") {
      return StudentRepo.findById(profileId);
    } else if (role === "tutor") {
      return TutorRepo.findById(profileId);
    } else if (role === "admin") {
      return AdminModel.findById(profileId);
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

  async checkEmailExists(email: string) {
    try {
      const existing = await UserRepo.findByEmail(email);
      return !!existing;
    } catch (error) {
      console.error("Error checking email existence:", error);
      return false;
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

    // 3. Create User with email verification
    const passwordHash = await bcrypt.hash(input.password, 10);
    
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await UserRepo.create({
      email: input.email,
      passwordHash,
      role: input.role,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
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

    // 5. Send email verification
    try {
      const userName = `${input.firstName} ${input.lastName}`;
      const verificationLink = `${process.env.FRONTEND_URL || 'https://campuslearn.onrender.com'}/verify-email/${verificationToken}`;
      
      const emailSent = await emailService.sendEmailVerificationEmail(
        input.email, 
        verificationLink, 
        userName
      );
      
      if (emailSent) {
        logger.info(`Email verification sent to ${input.email}`);
      } else {
        logger.warn(`Failed to send email verification to ${input.email}`);
      }
    } catch (error) {
      logger.error(`Error sending email verification to ${input.email}:`, error);
      // Continue with registration even if email fails
    }

    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  },

  async login(input: { email: string; password: string }) {
    console.log("Login attempt for email:", input.email);
    const user = await UserRepo.findByEmailWithPassword(input.email);
    if (!user) {
      console.log("User not found for email:", input.email);
      throw new Error("Invalid credentials");
    }
    console.log("User found:", { id: user._id, email: user.email, role: user.role, emailVerified: (user as any).emailVerified });

    const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
    if (!ok) {
      console.log("Password comparison failed for user:", user.email);
      throw new Error("Invalid credentials");
    }
    console.log("Password comparison successful for user:", user.email);

    const token = signJwt({
      id: (user as any)._id.toString(),
      role: user.role,
      email: user.email,
    });

    let profile: any;
    if (user.role === "student") {
      profile = await StudentRepo.findOne({ userId: (user as any)._id });
      console.log("Student profile lookup:", { userId: (user as any)._id, profileFound: !!profile, profile: profile });
    } else if (user.role === "tutor") {
      profile = await TutorRepo.findOne({ userId: (user as any)._id });
      console.log("Tutor profile lookup:", { userId: (user as any)._id, profileFound: !!profile, profile: profile });
    } else if (user.role === "admin") {
      profile = await AdminModel.findOne({ userId: (user as any)._id });
      console.log("Admin profile lookup:", { userId: (user as any)._id, profileFound: !!profile, profile: profile });
    }

    const { passwordHash: _ph, ...publicUser } = user as any;

    const userWithProfile = {
      ...publicUser,
      id: user._id.toString(),
      name: profile?.name,
      surname: profile?.surname,
      pfp: profile?.pfp?.data
        ? {
            contentType: profile.pfp.contentType,
            data: profile.pfp.data.toString("base64"),
          }
        : undefined,
      subjects: profile?.subjects,
      enrolledCourses: profile?.enrolledCourses,
    };

    // Removed verbose user profile logging
    return { token, user: userWithProfile };
  },

  async getPfp(userId: string) {
    const cacheKey = `pfp:user:${userId}`;

    const cachedPfp = await CacheService.get<{
      data: string;
      contentType: string;
    }>(cacheKey);
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
    } else if (user.role === "admin") {
      profile = await AdminModel.findOne({ userId: user._id }, { pfp: 1 });
    }

    const pfp = profile?.pfp || null;

    if (pfp && pfp.data) {
      const pfpToCache = {
        ...pfp,
        data: pfp.data.toString("base64"),
      };
      await CacheService.set(cacheKey, pfpToCache, 1800);
      return pfp;
    } else {
      // Return default profile picture when user has no profile picture
      await CacheService.set(cacheKey, null, 300);
      return defaultPfp;
    }
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
      throw new HttpException(
        400,
        `Unsupported image type: ${contentType}. Only JPEG, PNG, GIF, WEBP, BMP, SVG are allowed.`,
      );
    }

    const pfpData = {
      data: Buffer.from(data, "base64"),
      contentType,
    };

    try {
      const image = sharp(pfpData.data);
      const metadata = await image.metadata();

      if (
        (metadata.width && metadata.width > 250) ||
        (metadata.height && metadata.height > 250)
      ) {
        const originalSize = pfpData.data.length;
        const resizedBuffer = await image
          .resize(250, 250, { fit: "inside", withoutEnlargement: true })
          .toBuffer();
        pfpData.data = Buffer.from(resizedBuffer);
        const resizedSize = pfpData.data.length;
        const savedPercentage =
          ((originalSize - resizedSize) / originalSize) * 100;
        logger.info(
          `PFP resized: Original size ${originalSize} bytes, Resized size ${resizedSize} bytes. Saved ${savedPercentage.toFixed(2)}%`,
        );
      }
    } catch (error) {
      logger.error("Error resizing PFP:", error);
      // Proceed with the original image if resizing fails
    }

    if (user.role === "student") {
      await StudentRepo.updateOne({ userId }, { pfp: pfpData });
      // Invalidate student profile cache
      await StudentService.invalidateCache(userId);
    } else if (user.role === "tutor") {
      await TutorRepo.update({ userId }, { pfp: pfpData });
      // Invalidate tutor profile cache if it exists
    } else if (user.role === "admin") {
      await AdminModel.updateOne({ userId }, { pfp: pfpData });
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
      await StudentRepo.updateOne({ userId }, profileData);
      // Invalidate student cache on update
      await StudentService.invalidateCache(userId);
    } else if (user.role === "tutor") {
      await TutorRepo.update({ userId }, profileData);
    } else if (user.role === "admin") {
      await AdminModel.updateOne({ userId }, profileData);
    }
  },

  async updateEnrolledCourses(userId: string, enrolledCourses: string[]) {
    const user = await UserRepo.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== "student") {
      throw new Error("Only students can update enrolled courses");
    }

    // Update the student's enrolled courses
    await StudentRepo.updateOne({ userId }, { enrolledCourses });

    // Invalidate student cache on update
    await StudentService.invalidateCache(userId);

    // Return the updated student profile
    const updatedStudent = await StudentRepo.findOne({ userId });
    return updatedStudent;
  },

  async updatePassword(userId: string, current: string, newPass: string) {
    const user = await UserRepo.findByIdWithPassword(userId);
    if (!user) throw new Error("User not found");

    const ok = await bcrypt.compare(current, (user as any).passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const passwordHash = await bcrypt.hash(newPass, 10);
    await UserRepo.updateById(userId, { $set: { passwordHash } });
  },

  async list() {
    const users = await UserRepo.find({}, 1000, 0);

    // Populate profile data for each user
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profileData = {};

        if (user.role === "student") {
          const student = await StudentRepo.findOne({ userId: user._id });
          if (student) {
            profileData = {
              name: student.name,
              surname: student.surname,
            };
          }
        } else if (user.role === "tutor") {
          const tutor = await TutorRepo.findOne({ userId: user._id });
          if (tutor) {
            profileData = {
              name: tutor.name,
              surname: tutor.surname,
            };
          }
        } else if (user.role === "admin") {
          const admin = await AdminModel.findOne({ userId: user._id });
          if (admin) {
            profileData = {
              name: admin.name,
              surname: admin.surname,
            };
          }
        }

        return {
          ...user,
          ...profileData,
        };
      }),
    );

    return usersWithProfiles;
  },

  async getAdminStats() {
    try {
      // Get total users count
      const totalUsers = await UserModel.countDocuments();

      // Get active users (users who logged in within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers = await UserModel.countDocuments({
        updatedAt: { $gte: sevenDaysAgo },
      });

      // Get total content count (from tutor uploads)
      const { FileModel } = await import("../../schemas/tutorUpload.schema");
      const totalContent = await FileModel.countDocuments();

      // Get system health based on aggregate connection speeds
      let systemHealth = "Good";
      try {
        // Import health service to get connection speeds
        const { HealthService } = await import("../../services/health.service");
        const healthChecks = await HealthService.runAllChecks();

        // Calculate aggregate score
        const aggregateScore =
          HealthService.calculateAggregateScore(healthChecks);
        systemHealth = `${aggregateScore.message} (Score: ${aggregateScore.score}/100)`;
      } catch (error) {
        console.error("System health check failed:", error);
        systemHealth = "Error - Health check failed";
      }

      // Get weekly user growth
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyGrowth = await UserModel.countDocuments({
        createdAt: { $gte: oneWeekAgo },
      });

      // Get daily active users
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const dailyActiveUsers = await UserModel.countDocuments({
        updatedAt: { $gte: oneDayAgo },
      });

      // Get monthly content growth
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const monthlyContentGrowth = await FileModel.countDocuments({
        createdAt: { $gte: oneMonthAgo },
      });

      return {
        totalUsers,
        activeUsers,
        totalContent,
        systemHealth,
        weeklyGrowth,
        dailyActiveUsers,
        monthlyContentGrowth,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  },

  async getRecentActivity() {
    try {
      const activities = [];

      // Get recent user registrations
      const recentUsers = await UserModel.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      for (const user of recentUsers) {
        activities.push({
          icon: "fas fa-user-plus",
          title: "New User Registration",
          description: `${user.role} registered successfully`,
          time: this.getTimeAgo(user.createdAt),
          type: "success",
        });
      }

      // Get recent content uploads
      const { FileModel } = await import("../../schemas/tutorUpload.schema");
      const recentUploads = await FileModel.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("tutorId", "name surname")
        .lean();

      for (const upload of recentUploads) {
        const tutorName =
          upload.tutorId &&
          typeof upload.tutorId === "object" &&
          "name" in upload.tutorId
            ? `${(upload.tutorId as any).name} ${(upload.tutorId as any).surname}`
            : "Unknown Tutor";
        activities.push({
          icon: "fas fa-upload",
          title: "Content Uploaded",
          description: `${tutorName} uploaded new material`,
          time: this.getTimeAgo(upload.createdAt),
          type: "info",
        });
      }

      // Get recent forum posts
      const { ForumPostModel } = await import("../../schemas/forumPost.schema");
      const recentPosts = await ForumPostModel.find({})
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();

      for (const post of recentPosts) {
        // Get author name from the appropriate collection based on role
        let authorName = "Unknown User";
        if (post.authorRole === "student") {
          const student = await StudentRepo.findOne({ userId: post.authorId });
          if (student) {
            authorName = `${student.name} ${student.surname}`;
          }
        } else if (post.authorRole === "tutor") {
          const tutor = await TutorRepo.findOne({ userId: post.authorId });
          if (tutor) {
            authorName = `${tutor.name} ${tutor.surname}`;
          }
        } else if (post.authorRole === "admin") {
          const admin = await AdminModel.findOne({ userId: post.authorId });
          if (admin) {
            authorName = `${admin.name} ${admin.surname}`;
          }
        }

        activities.push({
          icon: "fas fa-comments",
          title: "New Forum Post",
          description: `${authorName} posted in ${post.topic}`,
          time: this.getTimeAgo(post.createdAt),
          type: "info",
        });
      }

      // Sort activities by time (most recent first) and limit to 5 items
      return activities
        .sort((a, b) => {
          const timeA = this.parseTimeAgo(a.time);
          const timeB = this.parseTimeAgo(b.time);
          return timeB - timeA; // Reverse the order to show newest first
        })
        .slice(0, 5); // Limit to only the 5 most recent activities
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return [];
    }
  },

  getTimeAgo(date: Date | string) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  },

  parseTimeAgo(timeStr: string) {
    const now = new Date().getTime();
    const match = timeStr.match(/(\d+)\s+(second|minute|hour|day)s?\s+ago/);
    if (!match) return now;

    const value = parseInt(match[1]);
    const unit = match[2];
    let multiplier = 1000; // seconds

    switch (unit) {
      case "minute":
        multiplier *= 60;
        break;
      case "hour":
        multiplier *= 3600;
        break;
      case "day":
        multiplier *= 86400;
        break;
    }

    return now - value * multiplier;
  },

  async get(id: string) {
    return await UserRepo.findById(id);
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

  async remove(id: string, isAdminDeletion: boolean = false) {
    // Validate input
    if (!id) {
      throw new Error("User ID is required");
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new Error("Invalid user ID format");
    }

    const user = await UserRepo.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    logger.info(
      `Starting comprehensive deletion for user ${id} (${user.email})`,
    );

    try {
      // Get role-specific profile first (we'll need it for multiple operations)
      let studentProfile: any = null;
      let tutorProfile: any = null;

      if (user.role === "student") {
        studentProfile = await StudentRepo.findOne({ userId: id });
      } else if (user.role === "tutor") {
        tutorProfile = await TutorRepo.findOne({ userId: id });
      }

      // Get user's name for email notification
      let userName = "User";
      if (user.role === "student" && studentProfile) {
        userName = `${studentProfile.name} ${studentProfile.surname}`;
      } else if (user.role === "tutor" && tutorProfile) {
        userName = `${tutorProfile.name} ${tutorProfile.surname}`;
      } else if (user.role === "admin") {
        const adminProfile = await AdminModel.findOne({ userId: id }).lean();
        if (adminProfile) {
          userName = `${adminProfile.name} ${adminProfile.surname}`;
        }
      }

      // 1. Delete chat messages
      await ChatService.deleteAllMessagesForUser(id);
      logger.info(`Deleted chat messages for user ${id}`);

      // 2. Delete forum posts and replies
      // Get the profile ID to use for forum deletion (forum posts use profile ID, not user ID)
      let profileId: string | null = null;
      if (user.role === "student" && studentProfile) {
        profileId = studentProfile._id.toString();
      } else if (user.role === "tutor" && tutorProfile) {
        profileId = tutorProfile._id.toString();
      } else if (user.role === "admin") {
        const adminProfile = await AdminModel.findOne({ userId: id }).lean();
        if (adminProfile) {
          profileId = adminProfile._id.toString();
        }
      }

      if (profileId) {
        // First, get all posts by this user to clean up their replies arrays
        const userPosts = await ForumPostModel.find({
          authorId: profileId,
        }).lean();

        // Delete all replies to posts made by this user
        for (const post of userPosts) {
          const repliesToPost = await ForumReplyModel.deleteMany({
            postId: post._id,
          });
          logger.info(
            `Deleted ${repliesToPost.deletedCount} replies to post ${post._id}`,
          );

          // Emit socket event to notify clients that the post and its replies were deleted
          io.emit("post_deleted", { postId: post._id });
        }

        // Delete all replies made by this user
        const userReplies = await ForumReplyModel.find({
          authorId: profileId,
        }).lean();
        for (const reply of userReplies) {
          // Remove this reply from the post's replies array
          await ForumPostModel.updateOne(
            { _id: reply.postId },
            { $pull: { replies: reply._id } },
          );

          // Emit socket event to notify clients that this reply was deleted
          io.emit("reply_deleted", {
            replyId: reply._id,
            threadId: reply.postId,
          });
        }

        const forumRepliesResult = await ForumReplyModel.deleteMany({
          authorId: profileId,
        });
        logger.info(
          `Deleted ${forumRepliesResult.deletedCount} forum replies for user ${id}`,
        );

        // Delete all posts made by this user
        const forumPostsResult = await ForumPostModel.deleteMany({
          authorId: profileId,
        });
        logger.info(
          `Deleted ${forumPostsResult.deletedCount} forum posts for user ${id}`,
        );

        // Debug: Check if any posts still exist for this user
        const remainingPosts = await ForumPostModel.find({
          authorId: profileId,
        }).lean();
        if (remainingPosts.length > 0) {
          logger.error(
            `WARNING: ${remainingPosts.length} forum posts still exist for deleted user ${id}`,
          );
          logger.error(
            `Remaining post IDs: ${remainingPosts.map((p) => p._id).join(", ")}`,
          );
        }
      } else {
        logger.warn(
          `No profile ID found for user ${id}, skipping forum deletion`,
        );
      }

      // 3. Delete user votes
      const userVotesResult = await UserVoteModel.deleteMany({ userId: id });
      logger.info(
        `Deleted ${userVotesResult.deletedCount} user votes for user ${id}`,
      );

      // 4. Delete uploaded files (for tutors) and clean up GCS files
      if (user.role === "tutor" && tutorProfile) {
        // First, get all files to delete from GCS before removing from database
        const filesToDelete = await FileModel.find({
          tutorId: tutorProfile._id,
        }).lean();

        // Delete files from GCS bucket
        for (const file of filesToDelete) {
          if (file.externalUri) {
            try {
              await gcsService.deleteObject(file.externalUri);
              logger.info(`Deleted GCS file: ${file.externalUri}`);
            } catch (error) {
              logger.warn(
                `Failed to delete GCS file ${file.externalUri}:`,
                error,
              );
            }
          }
        }

        const filesResult = await FileModel.deleteMany({
          tutorId: tutorProfile._id,
        });
        logger.info(
          `Deleted ${filesResult.deletedCount} uploaded files for tutor ${id}`,
        );
      }

      // 5. Delete video uploads and clean up GCS files
      const videosToDelete = await VideoModel.find({ uploaderId: id }).lean();

      // Delete videos from GCS bucket
      for (const video of videosToDelete) {
        if (video.bucketPath) {
          try {
            await gcsService.deleteObject(video.bucketPath);
            logger.info(`Deleted GCS video: ${video.bucketPath}`);
          } catch (error) {
            logger.warn(
              `Failed to delete GCS video ${video.bucketPath}:`,
              error,
            );
          }
        }
      }

      const videosResult = await VideoModel.deleteMany({ uploaderId: id });
      logger.info(`Deleted ${videosResult.deletedCount} videos for user ${id}`);

      // 6. Delete bookings
      let bookingsResult = { deletedCount: 0 };
      if (user.role === "student" && studentProfile) {
        bookingsResult = await BookingModel.deleteMany({
          studentId: studentProfile._id,
        });
      } else if (user.role === "tutor" && tutorProfile) {
        bookingsResult = await BookingModel.deleteMany({
          tutorId: tutorProfile._id,
        });
      }
      logger.info(
        `Deleted ${bookingsResult.deletedCount} bookings for user ${id}`,
      );

      // 7. Delete subscriptions
      let subscriptionsResult = { deletedCount: 0 };
      if (user.role === "student" && studentProfile) {
        subscriptionsResult = await SubscriptionModel.deleteMany({
          studentId: studentProfile._id,
        });
      } else if (user.role === "tutor" && tutorProfile) {
        subscriptionsResult = await SubscriptionModel.deleteMany({
          tutorId: tutorProfile._id,
        });
      }
      logger.info(
        `Deleted ${subscriptionsResult.deletedCount} subscriptions for user ${id}`,
      );

      // 8. Delete role-specific profile
      if (user.role === "student" && studentProfile) {
        await StudentRepo.findByIdAndDelete(studentProfile._id);
        await StudentService.invalidateCache(id);
        logger.info(`Deleted student profile for user ${id}`);
      } else if (user.role === "tutor" && tutorProfile) {
        // Delete all files uploaded by this tutor (including compressed versions)
        try {
          const { FileService } = await import("../files/file.service");
          const tutorFiles = await FileService.findByTutorId(
            tutorProfile._id.toString(),
          );

          logger.info(
            `Found ${tutorFiles.length} files to delete for tutor ${id}`,
          );

          for (const file of tutorFiles) {
            await FileService.remove((file as any)._id.toString());
            logger.info(`Deleted file ${(file as any)._id} for tutor ${id}`);
          }
        } catch (error) {
          logger.warn(`Failed to delete files for tutor ${id}:`, error);
          // Continue with user deletion even if file deletion fails
        }

        await TutorRepo.deleteById(tutorProfile._id.toString());
        logger.info(`Deleted tutor profile for user ${id}`);
      } else if (user.role === "admin") {
        await AdminModel.deleteOne({ userId: id });
        logger.info(`Deleted admin profile for user ${id}`);
      }

      // 9. Clear cache entries
      const cacheKeys = [
        `pfp:user:${id}`,
        `student:profile:${id}`,
        `tutor:profile:${id}`,
        `student:user:${id}`, // Student cache key
      ];

      // Note: Individual forum thread caching has been removed
      // Only thread list cache invalidation is needed, which happens automatically
      // when threads are deleted from the database

      for (const key of cacheKeys) {
        try {
          await CacheService.del(key);
        } catch (error) {
          logger.warn(`Failed to delete cache key ${key}:`, error);
        }
      }
      logger.info(`Cleared cache entries for user ${id}`);

      // 10. Send account deletion confirmation email
      try {
        const emailSent = isAdminDeletion 
          ? await emailService.sendAdminAccountDeletionEmail(user.email, userName)
          : await emailService.sendAccountDeletionEmail(user.email, userName);
        
        if (emailSent) {
          logger.info(`Account deletion email sent to ${user.email} (${isAdminDeletion ? 'admin-initiated' : 'self-initiated'})`);
        } else {
          logger.warn(`Failed to send account deletion email to ${user.email}`);
        }
      } catch (error) {
        logger.error(`Error sending account deletion email to ${user.email}:`, error);
        // Continue with deletion even if email fails
      }

      // 11. Finally, delete the user account
      const deletedUser = await UserRepo.deleteById(id);

      logger.info(
        `Successfully completed comprehensive deletion for user ${id}`,
      );
      return deletedUser;
    } catch (error) {
      logger.error(
        `Error during comprehensive deletion for user ${id}:`,
        error,
      );
      throw error;
    }
  },

  async deleteAccount(userId: string, password: string) {
    // Verify password before deletion
    const user = await UserRepo.findByIdWithPassword(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await bcrypt.compare(
      password,
      (user as any).passwordHash,
    );
    if (!passwordValid) {
      throw new Error("Invalid password");
    }

    // Use the comprehensive remove function
    return this.remove(userId);
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

    // Generate the reset link
    const resetLink = `${process.env.FRONTEND_URL || 'https://campuslearn.onrender.com'}/reset-password/${resetToken}`;
    
    // Send password reset email using our new email service
    try {
      const emailSent = await emailService.sendPasswordResetEmail(email, resetLink);
      if (emailSent) {
        console.log(`Password reset email sent to ${email}`);
      } else {
        console.log(`Failed to send password reset email to ${email}`);
      }
    } catch (error) {
      console.error(`Error sending password reset email to ${email}:`, error);
    }

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

  async getUserStats(): Promise<{ students: number; tutors: number }> {
    const [studentCount, tutorCount] = await Promise.all([
      StudentModel.countDocuments(),
      TutorModel.countDocuments(),
    ]);
    return { students: studentCount, tutors: tutorCount };
  },

  async verifyEmail(token: string) {
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserRepo.findOne({
      emailVerificationToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Email verification token is invalid or has expired.");
    }

    await UserRepo.updateById(user._id, {
      $set: {
        emailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      },
    });

    return { message: "Email verified successfully" };
  },

  async resendEmailVerification(email: string) {
    const user = await UserRepo.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.emailVerified) {
      throw new Error("Email is already verified");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await UserRepo.updateById(user._id, {
      $set: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Send verification email
    try {
      // Get user's name from profile
      let userName = "User";
      if (user.role === "student") {
        const studentProfile = await StudentRepo.findOne({ userId: user._id });
        if (studentProfile) {
          userName = `${studentProfile.name} ${studentProfile.surname}`;
        }
      } else if (user.role === "tutor") {
        const tutorProfile = await TutorRepo.findOne({ userId: user._id });
        if (tutorProfile) {
          userName = `${tutorProfile.name} ${tutorProfile.surname}`;
        }
      } else if (user.role === "admin") {
        const adminProfile = await AdminModel.findOne({ userId: user._id }).lean();
        if (adminProfile) {
          userName = `${adminProfile.name} ${adminProfile.surname}`;
        }
      }

      const verificationLink = `${process.env.FRONTEND_URL || 'https://campuslearn.onrender.com'}/verify-email/${verificationToken}`;
      
      const emailSent = await emailService.sendEmailVerificationEmail(
        email, 
        verificationLink, 
        userName
      );
      
      if (emailSent) {
        logger.info(`Email verification resent to ${email}`);
      } else {
        logger.warn(`Failed to resend email verification to ${email}`);
      }
    } catch (error) {
      logger.error(`Error resending email verification to ${email}:`, error);
      throw new Error("Failed to send verification email");
    }

    return { message: "Verification email sent successfully. Please check your spam/junk folder if you don't see it in your inbox." };
  },

  async updateEmailPreferences(userId: string, preferences: {
    bookingConfirmations?: boolean;
    generalNotifications?: boolean;
    marketingEmails?: boolean;
  }) {
    const user = await UserRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update email preferences
    const updatedPreferences = {
      ...user.emailPreferences,
      ...preferences,
    };

    await UserRepo.updateById(userId, {
      $set: { emailPreferences: updatedPreferences },
    });

    logger.info(`Email preferences updated for user ${userId}:`, updatedPreferences);
    return { message: "Email preferences updated successfully", preferences: updatedPreferences };
  },

  async getEmailPreferences(userId: string) {
    const user = await UserRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      preferences: user.emailPreferences || {
        bookingConfirmations: true,
        generalNotifications: true,
        marketingEmails: false,
      },
    };
  },
};
