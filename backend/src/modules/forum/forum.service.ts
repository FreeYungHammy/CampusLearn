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
import { HuggingFaceService } from "./huggingface.service";
import { HttpException } from "../../infra/http/HttpException";
import { CacheService } from "../../services/cache.service";
import { createLogger } from "../../config/logger";
import { UserVoteModel } from "../../schemas/userVote.schema";
import mongoose from "mongoose";

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

    const analysis = await HuggingFaceService.analyzeText(
      `${title} ${content}`,
    );
    console.log("Hugging Face Analysis:", analysis);

    if (HuggingFaceService.isToxic(analysis)) {
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

  async getThreads(user: User) {
    const dbStartTime = performance.now();
    const threads = await ForumPostModel.find().sort({ createdAt: -1 }).lean();

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
      userVote: voteMap[thread._id.toString()] || 0, // Add user's vote
    }));
    const dbDuration = performance.now() - dbStartTime;
    logger.info(
      `MongoDB retrieval for all threads took ${dbDuration.toFixed(2)} ms`,
    );

    return populatedThreads;
  },

  async getThreadById(threadId: string, user: User) {
    const dbStartTime = performance.now();
    const thread = await ForumPostModel.findById(threadId)
      .populate("replies")
      .lean();
    if (!thread) {
      return null;
    }

    // Fetch user votes for the thread and its replies
    const targetIds = [thread._id, ...thread.replies.map((r: any) => r._id)];
    const userVotes = await UserVoteModel.find({
      userId: user.id,
      targetId: { $in: targetIds },
    }).lean();
    const voteMap = userVotes.reduce((acc: { [key: string]: any }, vote) => {
      acc[vote.targetId.toString()] = vote.voteType;
      return acc;
    }, {});

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
      userVote: voteMap[thread._id.toString()] || 0, // Add user's vote to the main thread
      replies: thread.replies.map((reply: any) => ({
        ...reply,
        author: reply.isAnonymous ? null : authorMap[reply.authorId.toString()],
        userVote: voteMap[reply._id.toString()] || 0, // Add user's vote to each reply
      })),
    };
    const dbDuration = performance.now() - dbStartTime;
    logger.info(
      `MongoDB retrieval for thread ${threadId} took ${dbDuration.toFixed(2)} ms`,
    );

    return populatedThread;
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

    const analysis = await HuggingFaceService.analyzeText(content);
    console.log("Hugging Face Analysis for reply:", analysis);

    if (HuggingFaceService.isToxic(analysis)) {
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
      author: formatAuthor(authorProfile),
    };

    io.to(threadId).emit("new_reply", populatedReply);
    io.emit("forum_reply_count_updated", {
      threadId: threadId,
      replyCount: updatedReplyCount,
    });

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
};
