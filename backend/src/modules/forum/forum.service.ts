import { performance } from "perf_hooks";
import { swearWords } from "../../utils/blacklist";
import {
  ForumPostModel,
  type ForumPostDoc,
} from "../../schemas/forumPost.schema";
import { ForumReplyModel } from "../../schemas/forumReply.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { io } from "../../config/socket";
import type { User } from "../../types/User";
import { HuggingFaceService } from "../ai/huggingface/huggingface.service";
import { HttpException } from "../../infra/http/HttpException";
import { CacheService } from "../../services/cache.service";
import { createLogger } from "../../config/logger";

const logger = createLogger("ForumService");
const FORUM_THREADS_CACHE_KEY = "forum:threads:all";
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

export const ForumService = {
  // ... createThread and createReply methods remain the same ...
  async createThread(user: User, data: Partial<ForumPostDoc>) {
    const { content, title } = data;
    if (!content || !title) {
      throw new HttpException(400, "Title and content are required.");
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
    await CacheService.del(FORUM_THREADS_CACHE_KEY);
    return populatedPostForEmit;
  },

  async getThreads() {
    const startTime = performance.now();
    const cachedThreads = await CacheService.get<any[]>(
      FORUM_THREADS_CACHE_KEY,
    );
    if (cachedThreads) {
      const duration = performance.now() - startTime;
      logger.info(
        `Redis retrieval for all threads took ${duration.toFixed(2)} ms (Cache Hit)`,
      );
      return cachedThreads;
    }

    const dbStartTime = performance.now();
    const threads = await ForumPostModel.find().sort({ createdAt: -1 }).lean();
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
    const authorMap = [...studentAuthors, ...tutorAuthors].reduce(
      (acc: { [key: string]: any }, author) => {
        acc[author._id.toString()] = formatAuthor(author);
        return acc;
      },
      {},
    );
    const populatedThreads = threads.map((thread) => ({
      ...thread,
      author: thread.isAnonymous ? null : authorMap[thread.authorId.toString()],
    }));
    const dbDuration = performance.now() - dbStartTime;
    logger.info(
      `MongoDB retrieval for all threads took ${dbDuration.toFixed(2)} ms (Cache Miss)`,
    );

    await CacheService.set(FORUM_THREADS_CACHE_KEY, populatedThreads, 900);
    return populatedThreads;
  },

  async getThreadById(threadId: string) {
    const cacheKey = FORUM_THREAD_CACHE_KEY(threadId);
    const startTime = performance.now();
    const cachedThread = await CacheService.get<any>(cacheKey);
    if (cachedThread) {
      const duration = performance.now() - startTime;
      logger.info(
        `Redis retrieval for thread ${threadId} took ${duration.toFixed(2)} ms (Cache Hit)`,
      );
      return cachedThread;
    }

    const dbStartTime = performance.now();
    const thread = await ForumPostModel.findById(threadId)
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
    const populatedThread = {
      ...thread,
      author: thread.isAnonymous ? null : authorMap[thread.authorId.toString()],
      replies: thread.replies.map((reply: any) => ({
        ...reply,
        author: reply.isAnonymous ? null : authorMap[reply.authorId.toString()],
      })),
    };
    const dbDuration = performance.now() - dbStartTime;
    logger.info(
      `MongoDB retrieval for thread ${threadId} took ${dbDuration.toFixed(2)} ms (Cache Miss)`,
    );

    await CacheService.set(cacheKey, populatedThread, 1800);
    return populatedThread;
  },

  async createReply(user: User, threadId: string, data: any) {
    const { content } = data;
    if (!content) {
      throw new HttpException(400, "Content is required.");
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
      author: formatAuthor(authorProfile),
    };

    io.to(threadId).emit("new_reply", populatedReply);
    io.emit("forum_reply_count_updated", {
      threadId: threadId,
      replyCount: updatedReplyCount,
    });

    await CacheService.del([
      FORUM_THREAD_CACHE_KEY(threadId),
      FORUM_THREADS_CACHE_KEY,
    ]);
    return populatedReply;
  },
};
