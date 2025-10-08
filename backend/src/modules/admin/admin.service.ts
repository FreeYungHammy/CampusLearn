import { AdminModel } from "../../schemas/admin.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { FileModel } from "../../schemas/tutorUpload.schema";
import { ForumPostModel } from "../../schemas/forumPost.schema";
import { ForumReplyModel } from "../../schemas/forumReply.schema";
import { VideoModel } from "../../schemas/video.schema";
import { UserModel } from "../../schemas/user.schema";
import { ChatModel } from "../../schemas/chat.schema";
import { BookingModel } from "../../schemas/booking.schema";
import { UserVoteModel } from "../../schemas/userVote.schema";
import { SubscriptionModel } from "../../schemas/subscription.schema";
import { gcsService } from "../../services/gcs.service";
import { CacheService } from "../../services/cache.service";
import { ChatService } from "../chat/chat.service";
import { StudentService } from "../students/student.service";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";
import { io } from "../../config/socket";

export class AdminService {
  private static getModel(entityType: string): any {
    const models: any = {
      admins: AdminModel,
      students: StudentModel,
      tutors: TutorModel,
      files: FileModel,
      "forum-posts": ForumPostModel,
      "forum-replies": ForumReplyModel,
    };

    return models[entityType];
  }

  static async getAllEntities(
    entityType: string,
    page: number = 1,
    limit: number = 50,
    search: string = "",
  ) {
    const Model = this.getModel(entityType);
    if (!Model) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const skip = (page - 1) * limit;
    let query = {};

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");

      if (entityType === "admins") {
        query = {
          $or: [{ name: searchRegex }, { surname: searchRegex }],
        };
      } else if (entityType === "students") {
        query = {
          $or: [{ name: searchRegex }, { surname: searchRegex }],
        };
      } else if (entityType === "tutors") {
        query = {
          $or: [
            { name: searchRegex },
            { surname: searchRegex },
            { subjects: searchRegex },
          ],
        };
      } else if (entityType === "files") {
        query = {
          $or: [
            { title: searchRegex },
            { subject: searchRegex },
            { subtopic: searchRegex },
            { description: searchRegex },
            { contentType: searchRegex },
          ],
        };
      } else if (entityType === "forum-posts") {
        query = {
          $or: [
            { title: searchRegex },
            { content: searchRegex },
            { topic: searchRegex },
          ],
        };
      } else if (entityType === "forum-replies") {
        query = {
          $or: [{ content: searchRegex }],
        };
      }
    }

    const [entities, total] = await Promise.all([
      Model.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Model.countDocuments(query),
    ]);

    // Populate related data for better display
    const populatedEntities = await this.populateEntities(entityType, entities);

    return {
      entities: populatedEntities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getEntityById(entityType: string, id: string) {
    const Model = this.getModel(entityType);
    if (!Model) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const entity = await Model.findById(id).lean({ virtuals: true });
    if (!entity) return null;

    const populated = await this.populateEntities(entityType, [entity]);
    return populated[0];
  }

  static async createEntity(entityType: string, data: any) {
    // Handle special cases for different entity types
    if (entityType === "admins") {
      // Create user first, then admin profile
      const user = new UserModel({
        email: data.email,
        password: data.password || "temp123", // Should be hashed
        role: "admin",
      });
      await user.save();

      const admin = new AdminModel({
        userId: user._id,
        name: data.name,
        surname: data.surname,
      });
      return await admin.save();
    } else if (entityType === "students") {
      // Create user first, then student profile
      const user = new UserModel({
        email: data.email,
        password: data.password || "temp123", // Should be hashed
        role: "student",
      });
      await user.save();

      const student = new StudentModel({
        userId: user._id,
        name: data.name,
        surname: data.surname,
        enrolledCourses: data.enrolledCourses
          ? data.enrolledCourses.split(",").map((c: string) => c.trim())
          : [],
      });
      return await student.save();
    } else if (entityType === "tutors") {
      // Create user first, then tutor profile
      const user = new UserModel({
        email: data.email,
        password: data.password || "temp123", // Should be hashed
        role: "tutor",
      });
      await user.save();

      const tutor = new TutorModel({
        userId: user._id,
        name: data.name,
        surname: data.surname,
        subjects: data.subjects
          ? data.subjects.split(",").map((s: string) => s.trim())
          : [],
        rating: { totalScore: 0, count: 0 },
      });
      return await tutor.save();
    } else if (entityType === "files") {
      // For files, we need to find the tutor by userId
      const tutor = await TutorModel.findOne({ userId: data.tutorId });
      if (!tutor) {
        throw new Error("Tutor not found");
      }

      const file = new FileModel({
        title: data.title,
        subject: data.subject,
        subtopic: data.subtopic,
        description: data.description,
        tutorId: tutor._id,
        contentType: data.contentType || "application/octet-stream",
      });
      return await file.save();
    } else if (entityType === "forum-posts") {
      const post = new ForumPostModel({
        title: data.title,
        content: data.content,
        topic: data.topic,
        authorId: data.authorId,
        authorRole: data.authorRole,
        isAnonymous: false, // Admins cannot change this
      });
      return await post.save();
    } else if (entityType === "forum-replies") {
      const reply = new ForumReplyModel({
        postId: data.postId,
        content: data.content,
        authorId: data.authorId,
        authorRole: data.authorRole,
        isAnonymous: false, // Admins cannot change this
      });
      return await reply.save();
    }

    // Default case - use the generic model
    const Model = this.getModel(entityType);
    if (!Model) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const entity = new Model(data);
    return await entity.save();
  }

  static async updateEntity(entityType: string, id: string, data: any) {
    const Model = this.getModel(entityType);
    if (!Model) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    // Handle special cases for array fields
    if (entityType === "students" && data.enrolledCourses) {
      data.enrolledCourses = data.enrolledCourses
        .split(",")
        .map((c: string) => c.trim());
    }
    if (entityType === "tutors" && data.subjects) {
      data.subjects = data.subjects.split(",").map((s: string) => s.trim());
    }

    const entity = await Model.findByIdAndUpdate(id, data, { new: true });
    return entity;
  }

  static async deleteEntity(entityType: string, id: string) {
    const Model = this.getModel(entityType);
    if (!Model) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    // Get the entity first to handle cascade deletion
    const entity = await Model.findById(id);
    if (!entity) {
      throw new Error("Entity not found");
    }

    // Special handling for files - delete from GCS as well
    if (entityType === "files") {
      // Delete from Google Cloud Storage if the file has an external URI
      if (entity.externalUri) {
        try {
          await gcsService.deleteObject(entity.externalUri);
          console.log(`Deleted file from GCS: ${entity.externalUri}`);
        } catch (error) {
          console.error(
            `Failed to delete file from GCS: ${entity.externalUri}`,
            error,
          );
          // Continue with database deletion even if GCS deletion fails
        }
      }

      // Also check if it's a video and delete from videos collection
      if (entity.contentType && entity.contentType.includes("video")) {
        try {
          await VideoModel.findOneAndDelete({ filename: entity.title });
          console.log(`Deleted video record: ${entity.title}`);
        } catch (error) {
          console.error(
            `Failed to delete video record: ${entity.title}`,
            error,
          );
        }
      }
    }

    // Cascade deletion for user-related entities using the same logic as UserService.remove
    if (["students", "tutors", "admins"].includes(entityType)) {
      const userId = entity.userId;
      if (userId) {
        console.log(
          `Performing comprehensive cascade delete for user: ${userId}`,
        );

        try {
          // Get the user to determine role
          const user = await UserModel.findById(userId);
          if (!user) {
            console.log(`User ${userId} not found, skipping cascade delete`);
            return await Model.findByIdAndDelete(id);
          }

          // Get role-specific profile first
          let studentProfile: any = null;
          let tutorProfile: any = null;

          if (user.role === "student") {
            studentProfile = await StudentRepo.findOne({ userId: userId });
          } else if (user.role === "tutor") {
            tutorProfile = await TutorRepo.findOne({ userId: userId });
          }

          // 1. Delete chat messages
          await ChatService.deleteAllMessagesForUser(userId);
          console.log(`Deleted chat messages for user ${userId}`);

          // 2. Delete forum posts and replies using profileId
          let profileId: string | null = null;
          if (user.role === "student" && studentProfile) {
            profileId = studentProfile._id.toString();
          } else if (user.role === "tutor" && tutorProfile) {
            profileId = tutorProfile._id.toString();
          } else if (user.role === "admin") {
            const adminProfile = await AdminModel.findOne({
              userId: userId,
            }).lean();
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
              console.log(
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
            console.log(
              `Deleted ${forumRepliesResult.deletedCount} forum replies for user ${userId}`,
            );

            // Delete all posts made by this user
            const forumPostsResult = await ForumPostModel.deleteMany({
              authorId: profileId,
            });
            console.log(
              `Deleted ${forumPostsResult.deletedCount} forum posts for user ${userId}`,
            );
          }

          // 3. Delete user votes
          const userVotesResult = await UserVoteModel.deleteMany({
            userId: userId,
          });
          console.log(
            `Deleted ${userVotesResult.deletedCount} user votes for user ${userId}`,
          );

          // 4. Delete uploaded files (for tutors) and clean up GCS files
          if (user.role === "tutor" && tutorProfile) {
            const filesToDelete = await FileModel.find({
              tutorId: tutorProfile._id,
            }).lean();

            // Delete files from GCS bucket
            for (const file of filesToDelete) {
              if (file.externalUri) {
                try {
                  await gcsService.deleteObject(file.externalUri);
                  console.log(`Deleted GCS file: ${file.externalUri}`);
                } catch (error) {
                  console.warn(
                    `Failed to delete GCS file ${file.externalUri}:`,
                    error,
                  );
                }
              }
            }

            const filesResult = await FileModel.deleteMany({
              tutorId: tutorProfile._id,
            });
            console.log(
              `Deleted ${filesResult.deletedCount} uploaded files for tutor ${userId}`,
            );
          }

          // 5. Delete video uploads and clean up GCS files
          const videosToDelete = await VideoModel.find({
            uploaderId: userId,
          }).lean();

          // Delete videos from GCS bucket
          for (const video of videosToDelete) {
            if (video.bucketPath) {
              try {
                await gcsService.deleteObject(video.bucketPath);
                console.log(`Deleted GCS video: ${video.bucketPath}`);
              } catch (error) {
                console.warn(
                  `Failed to delete GCS video ${video.bucketPath}:`,
                  error,
                );
              }
            }
          }

          const videosResult = await VideoModel.deleteMany({
            uploaderId: userId,
          });
          console.log(
            `Deleted ${videosResult.deletedCount} videos for user ${userId}`,
          );

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
          console.log(
            `Deleted ${bookingsResult.deletedCount} bookings for user ${userId}`,
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
          console.log(
            `Deleted ${subscriptionsResult.deletedCount} subscriptions for user ${userId}`,
          );

          // 8. Delete role-specific profile
          if (user.role === "student" && studentProfile) {
            await StudentRepo.findByIdAndDelete(studentProfile._id);
            await StudentService.invalidateCache(userId);
            console.log(`Deleted student profile for user ${userId}`);
          } else if (user.role === "tutor" && tutorProfile) {
            await TutorRepo.deleteById(tutorProfile._id.toString());
            console.log(`Deleted tutor profile for user ${userId}`);
          } else if (user.role === "admin") {
            await AdminModel.deleteOne({ userId: userId });
            console.log(`Deleted admin profile for user ${userId}`);
          }

          // 9. Clear cache entries
          const cacheKeys = [
            `pfp:user:${userId}`,
            `student:profile:${userId}`,
            `tutor:profile:${userId}`,
            `student:user:${userId}`,
          ];

          // Clear forum thread caches for posts made by this user
          if (profileId) {
            const userPosts = await ForumPostModel.find({
              authorId: profileId,
            }).lean();
            for (const post of userPosts) {
              cacheKeys.push(`forum:thread:${post._id}`);
            }
          }

          for (const key of cacheKeys) {
            try {
              await CacheService.del(key);
            } catch (error) {
              console.warn(`Failed to delete cache key ${key}:`, error);
            }
          }
          console.log(`Cleared cache entries for user ${userId}`);

          // 10. Finally, delete the user account
          await UserModel.findByIdAndDelete(userId);
          console.log(`Deleted user account: ${userId}`);
        } catch (error) {
          console.error(
            `Error during cascade delete for user ${userId}:`,
            error,
          );
          // Continue with profile deletion even if cascade fails
        }
      }
    }

    // Delete the main entity
    const deletedEntity = await Model.findByIdAndDelete(id);
    return deletedEntity;
  }

  private static async populateEntities(entityType: string, entities: any[]) {
    if (entityType === "files") {
      // Populate tutor information for files
      const tutorIds = entities.map((e) => e.tutorId).filter(Boolean);
      const tutors = await TutorModel.find({ _id: { $in: tutorIds } }).lean();
      const tutorMap = new Map(tutors.map((t) => [t._id.toString(), t]));

      return entities.map((entity) => ({
        ...entity,
        tutorName: entity.tutorId
          ? `${tutorMap.get(entity.tutorId.toString())?.name || "Unknown"} ${tutorMap.get(entity.tutorId.toString())?.surname || ""}`.trim()
          : "Unknown",
        fileType: entity.contentType || "unknown",
      }));
    } else if (entityType === "forum-posts" || entityType === "forum-replies") {
      // Populate author information
      const authorIds = entities.map((e) => e.authorId).filter(Boolean);
      const authorRoles = entities.map((e) => e.authorRole).filter(Boolean);

      const students = await StudentModel.find({
        _id: { $in: authorIds },
      }).lean();
      const tutors = await TutorModel.find({ _id: { $in: authorIds } }).lean();
      const admins = await AdminModel.find({ _id: { $in: authorIds } }).lean();

      const authorMap = new Map();
      [...students, ...tutors, ...admins].forEach((author) => {
        authorMap.set(author._id.toString(), author);
      });

      return entities.map((entity) => {
        const author = authorMap.get(entity.authorId?.toString());
        return {
          ...entity,
          authorName: author
            ? `${author.name} ${author.surname}`.trim()
            : "Unknown",
        };
      });
    }

    return entities;
  }
}
