import { performance } from "perf_hooks";
import { swearWords } from "../../utils/blacklist";
import {
  ForumPostModel,
  type ForumPostDoc,
} from "../../schemas/forumPost.schema";
import {
  ForumReplyModel,
  type ForumReplyDoc,
} from "../../schemas/forumReply.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { AdminModel } from "../../schemas/admin.schema";
import { UserModel } from "../../schemas/user.schema";
import { io } from "../../config/socket";
import type { User } from "../../types/User";
import ToxicityService from "./toxicity.service";
import { HttpException } from "../../infra/http/HttpException";
import { CacheService } from "../../services/cache.service";
import { createLogger } from "../../config/logger";
import { UserVoteModel } from "../../schemas/userVote.schema";
import { emailService } from "../../services/email.service";
import { UserService } from "../users/user.service";
import mongoose from "mongoose";

const logger = createLogger("ForumService");
const FORUM_THREAD_CACHE_KEY = (id: string) => `forum:thread:${id}`;
const FORUM_THREADS_CACHE_KEY = "forum:threads:all";

function formatAuthorForList(author: any) {
  if (!author) return null;
  const { pfp, ...rest } = author;
  const formatted: any = { ...rest };
  if (author.updatedAt) {
    formatted.pfpTimestamp = new Date(author.updatedAt).getTime();
  }
  return formatted;
}

function formatAuthor(author: any) {
  if (!author) return null;
  const formatted: any = { ...author };
  if (author.pfp && author.pfp.data instanceof Buffer) {
    formatted.pfp = {
      contentType: author.pfp.contentType,
      data: author.pfp.data.toString("base64"),
    };
  }
  if (author.updatedAt) {
    formatted.pfpTimestamp = new Date(author.updatedAt).getTime();
  }
  return formatted;
}

function stripPfp(author: any) {
  if (!author) return null;
  const { pfp, ...rest } = author;
  return rest;
}

export const ForumService = {
  // ... createThread and createReply methods remain the same ...
  async createThread(user: User, data: Partial<ForumPostDoc>) {
    const { content, title } = data;
    if (!content || !title) {
      throw new HttpException(400, "Title and content are required.");
    }

    // Blacklist check
    const combinedText = `${title} ${content}`.toLowerCase();
    for (const word of swearWords) {
      if (combinedText.includes(word)) {
        throw new HttpException(
          400,
          `Your post contains a forbidden word: ${word}`,
        );
      }
    }

    const analysis = await ToxicityService.checkToxicity(`${title} ${content}`);
    console.log("Toxicity Analysis:", analysis);

    const isToxic = analysis.some(
      (result: any) => result.label === "toxic" && result.score > 0.9,
    );

    if (isToxic) {
      throw new HttpException(400, "Your post has been flagged as toxic.");
    }

    let authorProfile;
    if (user.role === "student") {
      authorProfile = await StudentModel.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
      }).lean();
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
      }).lean();
    } else if (user.role === "admin") {
      authorProfile = await AdminModel.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
      }).lean();
    }

    if (!authorProfile) {
      throw new Error("User profile not found");
    }

    const newPost = await ForumPostModel.create({
      ...data,
      authorId: authorProfile._id,
      authorRole: user.role,
    });

    const populatedPostForEmit = {
      ...newPost.toObject(),
      author: formatAuthor(authorProfile),
    };

    io.emit("new_post", populatedPostForEmit);
    
    // Invalidate the forum threads list cache
    console.log(`[createThread] Invalidating cache for key: ${FORUM_THREADS_CACHE_KEY}`);
    await CacheService.del(FORUM_THREADS_CACHE_KEY);
    console.log(`[createThread] Cache invalidation completed for key: ${FORUM_THREADS_CACHE_KEY}`);
    
    return populatedPostForEmit;
  },

  async getThreads(
    user: User,
    sortBy?: string,
    searchQuery?: string,
    topic?: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    // Only cache if no search/filter parameters (for performance)
    const shouldCache = !searchQuery && !topic && sortBy !== "upvotes";
    
    if (shouldCache && offset === 0) {
      const cacheKey = FORUM_THREADS_CACHE_KEY;
      const startTime = performance.now();
      
      // Removed verbose cache attempt logging
      const cachedThreads = await CacheService.get<{ threads: any[]; totalCount: number }>(cacheKey);
      if (cachedThreads) {
        // Removed verbose cache hit logging
        // Add user vote information to cached threads
        const threadsWithUserVotes = await ForumService.addUserVoteInfoToThreads(cachedThreads.threads, user);
        return {
          threads: threadsWithUserVotes,
          totalCount: cachedThreads.totalCount
        };
      } else {
        // Removed verbose cache miss logging
      }
    }

    const dbStartTime = performance.now();
    const matchStage: any = {};
    if (topic) {
      // Split comma-separated topics and use OR logic
      const topics = topic.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (topics.length > 0) {
        matchStage.topic = { $in: topics };
      }
    }
    if (searchQuery) {
      matchStage.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const sortStage: any = {};
    if (sortBy === "upvotes") {
      sortStage.upvotes = -1;
    } else {
      sortStage.createdAt = -1; // Default to newest
    }

    const aggregation = ForumPostModel.aggregate([
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: offset },
      { $limit: limit },
      // Lookup author details
      {
        $lookup: {
          from: "students", // Assuming the collection name is 'students'
          localField: "authorId",
          foreignField: "_id",
          as: "studentAuthor",
        },
      },
      {
        $lookup: {
          from: "tutors", // Assuming the collection name is 'tutors'
          localField: "authorId",
          foreignField: "_id",
          as: "tutorAuthor",
        },
      },
      {
        $lookup: {
          from: "admins", // Assuming the collection name is 'admins'
          localField: "authorId",
          foreignField: "_id",
          as: "adminAuthor",
        },
      },
      // Lookup user's vote
      {
        $lookup: {
          from: "uservotes",
          let: { thread_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$thread_id"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(user.id)] },
                    { $eq: ["$targetType", "ForumPost"] },
                  ],
                },
              },
            },
          ],
          as: "userVoteInfo",
        },
      },
      {
        $addFields: {
          author: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$authorRole", "student"] },
                  then: { $arrayElemAt: ["$studentAuthor", 0] },
                },
                {
                  case: { $eq: ["$authorRole", "tutor"] },
                  then: { $arrayElemAt: ["$tutorAuthor", 0] },
                },
                {
                  case: { $eq: ["$authorRole", "admin"] },
                  then: { $arrayElemAt: ["$adminAuthor", 0] },
                },
              ],
              default: null,
            },
          },
          userVote: {
            $ifNull: [{ $arrayElemAt: ["$userVoteInfo.voteType", 0] }, 0],
          },
        },
      },
      {
        $project: {
          studentAuthor: 0,
          tutorAuthor: 0,
          adminAuthor: 0,
          userVoteInfo: 0,
          "author.pfp": 0, // Exclude PFP data
        },
      },
    ]);

    const totalCountPromise = ForumPostModel.countDocuments(matchStage);
    const [threads, totalCount] = await Promise.all([
      aggregation,
      totalCountPromise,
    ]);

    const dbDuration = performance.now() - dbStartTime;
    // Removed verbose aggregation timing

    // Manually add pfpTimestamp
    const populatedThreads = threads.map((thread) => {
      if (thread.author && thread.author.updatedAt) {
        thread.author.pfpTimestamp = new Date(
          thread.author.updatedAt,
        ).getTime();
      }
      return thread;
    });

    const result = { threads: populatedThreads, totalCount };

    // Cache the result if it's the default query (no filters, first page)
    if (shouldCache && offset === 0) {
      // Removed verbose cache setting logging
      await CacheService.set(FORUM_THREADS_CACHE_KEY, result, 1800); // 30 minutes TTL
      // Removed verbose cache set logging
    } else {
      // Removed verbose cache skip logging
    }

    return result;
  },

  async getThreadById(threadId: string, user: User) {
    // Always fetch fresh data from database for accurate vote counts
    const dbStartTime = performance.now();

    const aggregation = ForumPostModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(threadId) } },
      // Thread author lookup
      {
        $lookup: {
          from: "students",
          localField: "authorId",
          foreignField: "_id",
          as: "studentAuthor",
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "authorId",
          foreignField: "_id",
          as: "tutorAuthor",
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "authorId",
          foreignField: "_id",
          as: "adminAuthor",
        },
      },
      // Thread user vote lookup
      {
        $lookup: {
          from: "uservotes",
          let: { thread_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$thread_id"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(user.id)] },
                  ],
                },
              },
            },
          ],
          as: "userVoteInfo",
        },
      },
      // Replies lookup
      {
        $lookup: {
          from: "forumreplies",
          localField: "replies",
          foreignField: "_id",
          as: "replies",
        },
      },
      {
        $addFields: {
          author: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$authorRole", "student"] },
                  then: { $arrayElemAt: ["$studentAuthor", 0] },
                },
                {
                  case: { $eq: ["$authorRole", "tutor"] },
                  then: { $arrayElemAt: ["$tutorAuthor", 0] },
                },
                {
                  case: { $eq: ["$authorRole", "admin"] },
                  then: { $arrayElemAt: ["$adminAuthor", 0] },
                },
              ],
              default: null,
            },
          },
          userVote: {
            $ifNull: [{ $arrayElemAt: ["$userVoteInfo.voteType", 0] }, 0],
          },
        },
      },
      // Unwind replies to process them
      { $unwind: { path: "$replies", preserveNullAndEmptyArrays: true } },
      // Reply author lookup
      {
        $lookup: {
          from: "students",
          localField: "replies.authorId",
          foreignField: "_id",
          as: "replyStudentAuthor",
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "replies.authorId",
          foreignField: "_id",
          as: "replyTutorAuthor",
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "replies.authorId",
          foreignField: "_id",
          as: "replyAdminAuthor",
        },
      },
      // Reply user vote lookup
      {
        $lookup: {
          from: "uservotes",
          let: { reply_id: "$replies._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$reply_id"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(user.id)] },
                  ],
                },
              },
            },
          ],
          as: "replyUserVoteInfo",
        },
      },
      {
        $addFields: {
          "replies.author": {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$replies.authorRole", "student"] },
                  then: { $arrayElemAt: ["$replyStudentAuthor", 0] },
                },
                {
                  case: { $eq: ["$replies.authorRole", "tutor"] },
                  then: { $arrayElemAt: ["$replyTutorAuthor", 0] },
                },
                {
                  case: { $eq: ["$replies.authorRole", "admin"] },
                  then: { $arrayElemAt: ["$replyAdminAuthor", 0] },
                },
              ],
              default: null,
            },
          },
          "replies.userVote": {
            $ifNull: [{ $arrayElemAt: ["$replyUserVoteInfo.voteType", 0] }, 0],
          },
        },
      },
      // Group back to reconstruct the thread
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          replies: {
            $push: {
              $cond: [
                { $ifNull: ["$replies._id", false] },
                "$replies",
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$root", { replies: "$replies" }] },
        },
      },
      {
        $project: {
          studentAuthor: 0,
          tutorAuthor: 0,
          adminAuthor: 0,
          userVoteInfo: 0,
          replyStudentAuthor: 0,
          replyTutorAuthor: 0,
          replyAdminAuthor: 0,
          replyUserVoteInfo: 0,
          "author.pfp": 0,
          "replies.author.pfp": 0,
        },
      },
    ]);

    const result = await aggregation;
    const thread = result[0]; // Get the thread from aggregation result

    if (thread) {
      if (thread.author && thread.author.updatedAt) {
        thread.author.pfpTimestamp = new Date(
          thread.author.updatedAt,
        ).getTime();
      }
      if (thread.replies) {
        thread.replies.forEach((reply: any) => {
          if (reply.author && reply.author.updatedAt) {
            reply.author.pfpTimestamp = new Date(
              reply.author.updatedAt,
            ).getTime();
          }
        });
      }
    }

    const dbDuration = performance.now() - dbStartTime;
    // Removed verbose aggregation timing

    return thread;
  },

  async createReply(user: User, threadId: string, data: any) {
    const { content } = data;
    if (!content) {
      throw new HttpException(400, "Content is required.");
    }

    // Blacklist check
    const lowerCaseContent = content.toLowerCase();
    for (const word of swearWords) {
      if (lowerCaseContent.includes(word)) {
        throw new HttpException(
          400,
          `Your reply contains a forbidden word: ${word}`,
        );
      }
    }

    const analysis = await ToxicityService.checkToxicity(content);
    console.log("Toxicity Analysis for reply:", analysis);

    const isToxic = analysis.some(
      (result: any) => result.label === "toxic" && result.score > 0.9,
    );

    if (isToxic) {
      throw new HttpException(400, "Your reply has been flagged as toxic.");
    }

    let authorProfile;
    if (user.role === "student") {
      authorProfile = await StudentModel.findOne({ userId: user.id }).lean();
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({ userId: user.id }).lean();
    } else if (user.role === "admin") {
      authorProfile = await AdminModel.findOne({ userId: user.id }).lean();
    }

    if (!authorProfile) {
      throw new Error("User profile not found");
    }

    const newReply = await ForumReplyModel.create({
      ...data,
      postId: threadId,
      authorId: authorProfile._id,
      authorRole: user.role,
    });
    await ForumPostModel.findByIdAndUpdate(threadId, {
      $push: { replies: newReply._id },
    });

    const updatedPost = await ForumPostModel.findById(threadId).lean();
    const updatedReplyCount = updatedPost ? updatedPost.replies.length : 0;

    const populatedReply = {
      ...newReply.toObject(),
      author: stripPfp(formatAuthor(authorProfile)),
    };

    io.to(threadId).emit("new_reply", populatedReply);
    io.emit("forum_reply_count_updated", {
      threadId: threadId,
      replyCount: updatedReplyCount,
    });

    // Send email notification to the original post author
    try {
      const originalPost = await ForumPostModel.findById(threadId).lean();
      if (originalPost) {
        // Get the original post author's profile
        let originalAuthorProfile;
        if (originalPost.authorRole === "student") {
          originalAuthorProfile = await StudentModel.findById(originalPost.authorId).lean();
        } else if (originalPost.authorRole === "tutor") {
          originalAuthorProfile = await TutorModel.findById(originalPost.authorId).lean();
        } else if (originalPost.authorRole === "admin") {
          originalAuthorProfile = await AdminModel.findById(originalPost.authorId).lean();
        }

        if (originalAuthorProfile) {
          // Get the original author's user account to get their email
          const originalAuthorUser = await UserModel.findById(originalAuthorProfile.userId).lean();
          
          if (originalAuthorUser && originalAuthorUser.email !== user.email) {
            // Only send email if the replier is not the same as the original author
            const replyDetails = {
              postTitle: originalPost.title,
              replierName: `${authorProfile.name} ${authorProfile.surname}`,
              replyContent: content,
              time: new Date().toLocaleString(),
              postUrl: `${process.env.FRONTEND_URL || 'https://campuslearn.onrender.com'}/forum/${threadId}`,
            };

            const emailSent = await emailService.sendForumReplyEmail(
              originalAuthorUser.email,
              replyDetails
            );
            
            if (emailSent) {
              logger.info(`Forum reply email sent to ${originalAuthorUser.email}`);
            } else {
              logger.warn(`Failed to send forum reply email to ${originalAuthorUser.email}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error sending forum reply email:", error);
      // Continue with reply creation even if email fails
    }

    return populatedReply;
  },

  async castVote(
    user: User,
    targetId: string,
    targetType: "ForumPost" | "ForumReply",
    voteType: 1 | -1,
  ) {
    console.log(`[castVote] Starting vote for user ${user.id}, target ${targetId}, type ${targetType}, vote ${voteType}`);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const Model = (
        targetType === "ForumPost" ? ForumPostModel : ForumReplyModel
      ) as mongoose.Model<any>;
      const targetDoc = await Model.findById(targetId).session(session);

      if (!targetDoc) {
        throw new HttpException(404, `${targetType} not found`);
      }

      console.log(`[castVote] Current vote count: ${targetDoc.upvotes}`);

      const existingVote = await UserVoteModel.findOne({
        userId: user.id,
        targetId,
        targetType,
      }).session(session);

      let voteChange = 0;

      if (existingVote) {
        console.log(`[castVote] Existing vote found: ${existingVote.voteType}, new vote: ${voteType}`);
        if (existingVote.voteType === voteType) {
          // User is removing their vote
          await UserVoteModel.deleteOne({ _id: existingVote._id }).session(
            session,
          );
          voteChange = -voteType; // e.g., if un-upvoting, subtract 1
          console.log(`[castVote] Removing vote, voteChange: ${voteChange}`);
        } else {
          // User is changing their vote
          existingVote.voteType = voteType;
          await existingVote.save({ session });
          voteChange = voteType * 2; // e.g., from -1 to 1 is a change of +2
          console.log(`[castVote] Changing vote, voteChange: ${voteChange}`);
        }
      } else {
        // New vote
        console.log(`[castVote] New vote, voteType: ${voteType}`);
        await UserVoteModel.create(
          [
            {
              userId: user.id,
              targetId,
              targetType,
              voteType,
            },
          ],
          { session },
        );
        voteChange = voteType;
        console.log(`[castVote] Created new vote, voteChange: ${voteChange}`);
      }

      const updatedTarget = (await Model.findByIdAndUpdate(
        targetId,
        { $inc: { upvotes: voteChange } },
        { new: true, session },
      ).lean()) as ForumPostDoc | ForumReplyDoc | null;

      console.log(`[castVote] Before commit - voteChange: ${voteChange}, current score: ${targetDoc.upvotes}, new score: ${updatedTarget?.upvotes}`);
      // Get the user's current vote state for this target before committing
      const userVote = await UserVoteModel.findOne({
        userId: user.id,
        targetId,
        targetType,
      }).session(session);

      await session.commitTransaction();
      console.log(`[castVote] Vote successful for user ${user.id}, new score: ${updatedTarget?.upvotes}`);

      // Invalidate cache and emit event after transaction commits
      const parentThreadId =
        targetType === "ForumPost"
          ? targetId
          : // @ts-ignore
            targetDoc.postId.toString();

      console.log(`[castVote] Emitting socket event: targetId=${targetId}, newScore=${updatedTarget?.upvotes}, userVote=${userVote?.voteType || 0}`);
      io.emit("vote_updated", {
        targetId,
        targetType,
        newScore: updatedTarget?.upvotes,
        userVote: userVote?.voteType || 0,
      });

      // Invalidate the forum threads list cache since vote counts have changed
      await CacheService.del(FORUM_THREADS_CACHE_KEY);

      // Return the updated target with user vote information
      const response = {
        ...updatedTarget,
        userVote: userVote?.voteType || 0,
      };

      return response;
    } catch (error) {
      console.error(`[castVote] Vote failed for user ${user.id}:`, error);
      await session.abortTransaction();
      throw error; // Re-throw the original error
    } finally {
      session.endSession();
    }
  },

  async deleteThread(user: User, threadId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const post = await ForumPostModel.findById(threadId).session(session);
      if (!post) {
        throw new HttpException(404, "Post not found");
      }

      const authorProfile = await UserService.getProfileByRole(
        post.authorId.toString(),
        post.authorRole,
      );
      if (
        user.role !== "admin" &&
        authorProfile?.userId.toString() !== user.id
      ) {
        throw new HttpException(
          403,
          "You are not authorized to delete this post",
        );
      }

      const replyIds = post.replies;
      const allTargetIds = [threadId, ...replyIds];

      await UserVoteModel.deleteMany({
        targetId: { $in: allTargetIds },
      }).session(session);
      await ForumReplyModel.deleteMany({ _id: { $in: replyIds } }).session(
        session,
      );
      await ForumPostModel.findByIdAndDelete(threadId).session(session);

      await session.commitTransaction();

      // Invalidate the forum threads list cache as the thread was removed
      console.log(`[deleteThread] Invalidating cache for key: ${FORUM_THREADS_CACHE_KEY}`);
      await CacheService.del(FORUM_THREADS_CACHE_KEY);
      console.log(`[deleteThread] Cache invalidation completed for key: ${FORUM_THREADS_CACHE_KEY}`);

      io.emit("thread_deleted", { threadId });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  async deleteReply(user: User, replyId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const reply = await ForumReplyModel.findById(replyId).session(session);
      if (!reply) {
        throw new HttpException(404, "Reply not found");
      }

      const authorProfile = await UserService.getProfileByRole(
        reply.authorId.toString(),
        reply.authorRole,
      );
      if (
        user.role !== "admin" &&
        authorProfile?.userId.toString() !== user.id
      ) {
        throw new HttpException(
          403,
          "You are not authorized to delete this reply",
        );
      }

      const threadId = reply.postId.toString();

      await UserVoteModel.deleteMany({ targetId: replyId }).session(session);
      await ForumReplyModel.findByIdAndDelete(replyId).session(session);
      await ForumPostModel.findByIdAndUpdate(
        threadId,
        { $pull: { replies: replyId } },
        { session },
      );

      await session.commitTransaction();

      io.to(threadId).emit("reply_deleted", { replyId, threadId });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  async updateThread(
    user: User,
    threadId: string,
    updateData: Partial<ForumPostDoc>,
  ) {
    const post = await ForumPostModel.findById(threadId);
    if (!post) {
      throw new HttpException(404, "Post not found");
    }

    const authorProfile = await UserService.getProfileByRole(
      post.authorId.toString(),
      post.authorRole,
    );
    if (authorProfile?.userId.toString() !== user.id) {
      throw new HttpException(403, "You are not authorized to edit this post");
    }

    // Check if the post is within the 10-minute edit window
    const now = new Date();
    const createdAt = post.createdAt;
    const timeDifference = now.getTime() - createdAt.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

    if (timeDifference > tenMinutesInMs) {
      throw new HttpException(
        403,
        "You can only edit your post within 10 minutes of creation for accountability purposes",
      );
    }

    const { title, content, topic } = updateData;
    if (title) post.title = title;
    if (content) post.content = content;
    if (topic) post.topic = topic;

    const updatedPost = await post.save();

    const populatedPost = await this.getThreadById(threadId, user);

    io.emit("thread_updated", { threadId, updatedPost: populatedPost });

    return populatedPost;
  },

  async updateReply(
    user: User,
    replyId: string,
    updateData: Partial<ForumReplyDoc>,
  ) {
    const reply = await ForumReplyModel.findById(replyId);
    if (!reply) {
      throw new HttpException(404, "Reply not found");
    }

    const authorProfile = await UserService.getProfileByRole(
      reply.authorId.toString(),
      reply.authorRole,
    );
    if (authorProfile?.userId.toString() !== user.id) {
      throw new HttpException(403, "You are not authorized to edit this reply");
    }

    // Check if the reply is within the 10-minute edit window
    const now = new Date();
    const createdAt = reply.createdAt;
    const timeDifference = now.getTime() - createdAt.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

    if (timeDifference > tenMinutesInMs) {
      throw new HttpException(
        403,
        "You can only edit your reply within 10 minutes of creation for accountability purposes",
      );
    }

    const { content } = updateData;
    if (content) reply.content = content;

    await reply.save();

    const threadId = reply.postId.toString();

    const populatedReply = {
      ...reply.toObject(),
      author: stripPfp(formatAuthor(authorProfile)),
    };

    io.to(threadId).emit("reply_updated", {
      replyId,
      threadId,
      updatedReply: populatedReply,
    });

    return populatedReply;
  },

  async addUserVoteInfoToThreads(threads: any[], user: User) {
    console.log(`[addUserVoteInfoToThreads] Adding vote info for ${threads.length} threads for user ${user.id}`);
    
    // Get all thread IDs
    const threadIds = threads.map(thread => thread._id);
    
    // Fetch user votes for all threads in one query
    const userVotes = await UserVoteModel.find({
      userId: user.id,
      targetId: { $in: threadIds },
      targetType: "ForumPost"
    });

    console.log(`[addUserVoteInfoToThreads] Found ${userVotes.length} user votes:`, userVotes.map(v => ({ targetId: v.targetId, voteType: v.voteType })));

    // Create a map of threadId -> voteType for quick lookup
    const voteMap = new Map();
    userVotes.forEach(vote => {
      voteMap.set(vote.targetId.toString(), vote.voteType);
    });

    // Add userVote field to each thread
    const result = threads.map(thread => ({
      ...thread,
      userVote: voteMap.get(thread._id.toString()) || 0
    }));

    console.log(`[addUserVoteInfoToThreads] Result:`, result.map(t => ({ id: t._id, upvotes: t.upvotes, userVote: t.userVote })));
    console.log(`[addUserVoteInfoToThreads] Vote counts from DB:`, result.map(t => ({ id: t._id, upvotes: t.upvotes, title: t.title?.substring(0, 20) })));
    
    return result;
  },
};
