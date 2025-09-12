import {
  ForumPostModel,
  type ForumPostDoc,
} from "../../schemas/forumPost.schema";
import { ForumReplyModel } from "../../schemas/forumReply.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { io } from "../../config/socket";
import type { User } from "../../types/User";

export const ForumService = {
  async createThread(user: User, data: Partial<ForumPostDoc>) {
    let authorProfile;
    if (user.role === "student") {
      authorProfile = await StudentModel.findOne({ userId: user.id });
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({ userId: user.id });
    }

    if (!authorProfile) {
      throw new Error("User profile not found");
    }

    const newPost = await ForumPostModel.create({
      ...data,
      authorId: authorProfile._id,
      authorRole: user.role,
    });

    const populatedPost = await this.getThreadById(newPost._id.toString());
    if (populatedPost) {
      console.log("Emitting new_post event:", populatedPost.title);
      io.emit("new_post", populatedPost);
    }

    return populatedPost;
  },

  async getThreads() {
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
        acc[author._id.toString()] = author;
        return acc;
      },
      {},
    );

    const populatedThreads = threads.map((thread) => ({
      ...thread,
      author: thread.isAnonymous ? null : authorMap[thread.authorId.toString()],
    }));

    return populatedThreads;
  },

  async getThreadById(threadId: string) {
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
        acc[author._id.toString()] = author;
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

    return populatedThread;
  },

  async createReply(user: User, threadId: string, data: any) {
    let authorProfile;
    if (user.role === "student") {
      authorProfile = await StudentModel.findOne({ userId: user.id });
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({ userId: user.id });
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

    const populatedReply = {
      ...newReply.toObject(),
      author: authorProfile,
    };

    io.to(threadId).emit("new_reply", populatedReply);
    console.log(
      "Emitting new_reply event to thread:",
      threadId,
      populatedReply.content,
    );

    return populatedReply;
  },
};
