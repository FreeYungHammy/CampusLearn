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
import { io } from "../../config/socket";
import type { User } from "../../types/User";
import ToxicityService from "./toxicity.service";
import { HttpException } from "../../infra/http/HttpException";
import { CacheService } from "../../services/cache.service";
import { createLogger } from "../../config/logger";
import { UserVoteModel } from "../../schemas/userVote.schema";
import { UserService } from "../users/user.service";
import mongoose from "mongoose";

const logger = createLogger("ForumService");
const FORUM_THREAD_CACHE_KEY = (id: string) => `forum:thread:${id}`;

function formatAuthor(author: any) {
  if (!author) return null;
  const formatted = { ...author };
  if (author.pfp && author.pfp.data instanceof Buffer) {
    formatted.pfp = {
      contentType: author.pfp.contentType,
      data: author.pfp.data.toString("base64"),
    };
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
      authorProfile = await StudentModel.findOne({ userId: user.id }).lean();
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({ userId: user.id }).lean();
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
    return populatedPostForEmit;
  },

  async getThreads(
    user: User,
    sortBy?: string,
    searchQuery?: string,
    topic?: string,
  ) {
    const dbStartTime = performance.now();
    const query: any = {};
    if (topic) {
      query.topic = topic;
    }
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const sort: any = {};
    if (sortBy === "upvotes") {
      sort.upvotes = -1;
    } else {
      sort.createdAt = -1; // Default to newest
    }

    const threads = await ForumPostModel.find(query).sort(sort).lean();

    // Fetch user votes
    const threadIds = threads.map((t) => t._id);
    const userVotes = await UserVoteModel.find({
      userId: user.id,
      targetId: { $in: threadIds },
      targetType: "ForumPost",
    }).lean();
    const voteMap = userVotes.reduce((acc: { [key: string]: any }, vote) => {
      acc[vote.targetId.toString()] = vote.voteType;
      return acc;
    }, {});

    const studentAuthorIds = threads
      .filter((t) => t.authorRole === "student")
      .map((t) => t.authorId);
    const tutorAuthorIds = threads
      .filter((t) => t.authorRole === "tutor")
      .map((t) => t.authorId);
    const [studentAuthors, tutorAuthors] = await Promise.all([
      StudentModel.find({ _id: { $in: studentAuthorIds } }).lean(),
      TutorModel.find({ _id: { $in: tutorAuthorIds } }).lean(),
    ]);

    // Base author map without pfp to avoid duplicating binary data in memory/cache
    const baseAuthorMap = [...studentAuthors, ...tutorAuthors].reduce(
      (acc: { [key: string]: any }, author) => {
        const formatted = formatAuthor(author);
        acc[author._id.toString()] = stripPfp(formatted);
        return acc;
      },
      {},
    );

    const enrichedAuthor = (_role: string, authorId: any) => {
      return baseAuthorMap[authorId.toString()] || null;
    };

    const populatedThreads = threads.map((thread) => ({
      ...thread,
      author: thread.isAnonymous
        ? null
        : enrichedAuthor(thread.authorRole, thread.authorId),
      userVote: voteMap[thread._id.toString()] || 0, // Add user's vote
    }));
    const dbDuration = performance.now() - dbStartTime;
    logger.info(
      `MongoDB retrieval for all threads took ${dbDuration.toFixed(2)} ms`,
    );

    return populatedThreads;
  },

  async getThreadById(threadId: string, user: User) {
    const cacheKey = FORUM_THREAD_CACHE_KEY(threadId);
    const startTime = performance.now();

    // 1. Check cache for the BASE thread data (no votes)
    let thread = await CacheService.get<any>(cacheKey);
    let cacheHit = false;

    if (thread) {
      cacheHit = true;
      const duration = performance.now() - startTime;
      logger.info(
        `Redis retrieval for thread ${threadId} took ${duration.toFixed(2)} ms (Cache Hit)`,
      );
    } else {
      // Cache Miss. Fetch base data from DB.
      const dbStartTime = performance.now();
      thread = await ForumPostModel.findById(threadId)
        .populate("replies")
        .lean();
      if (!thread) {
        return null;
      }

      const allAuthors = [thread, ...thread.replies.map((r: any) => r)];
      const studentAuthorIds = allAuthors
        .filter((p) => p.authorRole === "student")
        .map((p) => p.authorId);
      const tutorAuthorIds = allAuthors
        .filter((p) => p.authorRole === "tutor")
        .map((p) => p.authorId);
      const [studentAuthors, tutorAuthors] = await Promise.all([
        StudentModel.find({ _id: { $in: studentAuthorIds } }).lean(),
        TutorModel.find({ _id: { $in: tutorAuthorIds } }).lean(),
      ]);
      const authorMap = [...studentAuthors, ...tutorAuthors].reduce(
        (acc: { [key: string]: any }, author) => {
          acc[author._id.toString()] = formatAuthor(author);
          return acc;
        },
        {},
      );

      const authorForThread = thread.isAnonymous
        ? null
        : authorMap[thread.authorId.toString()];

      const repliesWithAuthors = thread.replies.map((reply: any) => ({
        ...reply,
        author: reply.isAnonymous ? null : authorMap[reply.authorId.toString()],
      }));

      // IMPORTANT: do not cache pfp with thread metadata
      const populatedThreadForCache = {
        ...thread,
        author: authorForThread ? stripPfp(authorForThread) : null,
        replies: repliesWithAuthors.map((r: any) => ({
          ...r,
          author: r.author ? stripPfp(r.author) : null,
        })),
      };

      await CacheService.set(cacheKey, populatedThreadForCache, 1800);
      thread = populatedThreadForCache;

      const dbDuration = performance.now() - dbStartTime;
      logger.info(
        `MongoDB retrieval for thread ${threadId} took ${dbDuration.toFixed(2)} ms (Cache Miss)`,
      );
    }

    // 2. Fetch USER-SPECIFIC vote data (never cached)
    const targetIds = [thread._id, ...thread.replies.map((r: any) => r._id)];
    const userVotes = await UserVoteModel.find({
      userId: user.id,
      targetId: { $in: targetIds },
    }).lean();
    const voteMap = userVotes.reduce((acc: { [key: string]: any }, vote) => {
      acc[vote.targetId.toString()] = vote.voteType;
      return acc;
    }, {});

    const finalPopulatedThread = {
      ...thread,
      author: thread.author,
      userVote: voteMap[thread._id.toString()] || 0,
      replies: thread.replies.map((reply: any) => ({
        ...reply,
        author: reply.author,
        userVote: voteMap[reply._id.toString()] || 0,
      })),
    };

    return finalPopulatedThread;
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

    await CacheService.del(FORUM_THREAD_CACHE_KEY(threadId));
    return populatedReply;
  },

  async castVote(
    user: User,
    targetId: string,
    targetType: "ForumPost" | "ForumReply",
    voteType: 1 | -1,
  ) {
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

      // @ts-ignore
      if (targetDoc.authorId.toString() === user.id) {
        throw new HttpException(403, "You cannot vote on your own content.");
      }

      const existingVote = await UserVoteModel.findOne({
        userId: user.id,
        targetId,
        targetType,
      }).session(session);

      let voteChange = 0;

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // User is removing their vote
          await UserVoteModel.deleteOne({ _id: existingVote._id }).session(
            session,
          );
          voteChange = -voteType; // e.g., if un-upvoting, subtract 1
        } else {
          // User is changing their vote
          existingVote.voteType = voteType;
          await existingVote.save({ session });
          voteChange = voteType * 2; // e.g., from -1 to 1 is a change of +2
        }
      } else {
        // New vote
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
      }

      const updatedTarget = (await Model.findByIdAndUpdate(
        targetId,
        { $inc: { upvotes: voteChange } },
        { new: true, session },
      ).lean()) as ForumPostDoc | ForumReplyDoc | null;

      await session.commitTransaction();

      // Invalidate cache and emit event after transaction commits
      const parentThreadId =
        targetType === "ForumPost"
          ? targetId
          : // @ts-ignore
            targetDoc.postId.toString();

      await CacheService.del(FORUM_THREAD_CACHE_KEY(parentThreadId));

      io.emit("vote_updated", {
        targetId,
        targetType,
        newScore: updatedTarget?.upvotes,
      });

      return updatedTarget;
    } catch (error) {
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
      if (authorProfile?.userId.toString() !== user.id) {
        throw new HttpException(403, "You are not authorized to delete this post");
      }

      const replyIds = post.replies;
      const allTargetIds = [threadId, ...replyIds];

      await UserVoteModel.deleteMany({ targetId: { $in: allTargetIds } }).session(
        session,
      );
      await ForumReplyModel.deleteMany({ _id: { $in: replyIds } }).session(
        session,
      );
      await ForumPostModel.findByIdAndDelete(threadId).session(session);

      await session.commitTransaction();

      await CacheService.del(FORUM_THREAD_CACHE_KEY(threadId));
      // In a real-world scenario, you might want to invalidate a general forum list cache as well
      // await CacheService.del("forum:threads:all");

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
      if (authorProfile?.userId.toString() !== user.id) {
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

      await CacheService.del(FORUM_THREAD_CACHE_KEY(threadId));

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

    const { title, content, topic } = updateData;
    if (title) post.title = title;
    if (content) post.content = content;
    if (topic) post.topic = topic;

    const updatedPost = await post.save();

    await CacheService.del(FORUM_THREAD_CACHE_KEY(threadId));

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

    const { content } = updateData;
    if (content) reply.content = content;

    await reply.save();

    const threadId = reply.postId.toString();
    await CacheService.del(FORUM_THREAD_CACHE_KEY(threadId));

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
};
