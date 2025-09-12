import mime from "mime-types";
import {
  ForumPostModel,
  type ForumPostDoc,
} from "../../schemas/forumPost.schema";
import { ForumReplyModel } from "../../schemas/forumReply.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { io } from "../../config/socket";
import type { User } from "../../types/User";

// Helper function to format PFP for frontend
function formatPfpForFrontend(author: any) {
  if (author && author.pfp) {
    let pfpData = author.pfp;

    // Check if it's a Buffer or ArrayBuffer
    if (pfpData instanceof Buffer) {
      pfpData = pfpData.toString("base64");
    } else if (pfpData instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Buffer, then to base64 string
      pfpData = Buffer.from(pfpData).toString("base64");
    } else if (
      typeof pfpData === "object" &&
      pfpData.type === "Buffer" &&
      Array.isArray(pfpData.data)
    ) {
      // Handle the case where Buffer is serialized as { type: 'Buffer', data: [...] }
      pfpData = Buffer.from(pfpData.data).toString("base64");
    } else {
      // If it's already a base64 string or another unexpected format, return as is
      return author.pfp; // This means it's already formatted or not binary
    }

    // Assuming contentType might be stored on the author object or default to image/png
    // If author.pfp was an object with contentType, use that. Otherwise, default.
    const contentType =
      author.pfp && typeof author.pfp === "object" && author.pfp.contentType
        ? author.pfp.contentType
        : mime.lookup("image.png") || "image/png";

    return {
      data: pfpData,
      contentType: contentType,
    };
  }
  return author?.pfp; // Return as is if not present or not an object with pfp
}

export const ForumService = {
  async createThread(user: User, data: Partial<ForumPostDoc>) {
    let authorProfile;
    if (user.role === "student") {
      authorProfile = await StudentModel.findOne({ userId: user.id }).lean();
    } else if (user.role === "tutor") {
      authorProfile = await TutorModel.findOne({ userId: user.id }).lean();
    }

    if (!authorProfile) {
      throw new Error("User profile not found");
    }

    // Format PFP for the authorProfile immediately
    if (authorProfile.pfp) {
      authorProfile.pfp = formatPfpForFrontend(authorProfile);
    }

    const newPost = await ForumPostModel.create({
      ...data,
      authorId: authorProfile._id,
      authorRole: user.role,
    });

    // Construct the populatedPost directly using the already formatted authorProfile.
    // This avoids a redundant DB call and ensures the PFP is formatted from the source.
    const populatedPostForEmit = {
      ...newPost.toObject(), // Convert Mongoose document to plain object
      author: authorProfile, // Use the already formatted authorProfile
    };

    console.log("Emitting new_post event:", populatedPostForEmit.title);
    io.emit("new_post", populatedPostForEmit);

    return populatedPostForEmit; // Return the formatted object
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
      author: thread.isAnonymous
        ? null
        : {
            ...authorMap[thread.authorId.toString()],
            pfp: formatPfpForFrontend(authorMap[thread.authorId.toString()]),
          },
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
      author: thread.isAnonymous
        ? null
        : {
            ...authorMap[thread.authorId.toString()],
            pfp: formatPfpForFrontend(authorMap[thread.authorId.toString()]),
          },
      replies: thread.replies.map((reply: any) => ({
        ...reply,
        author: reply.isAnonymous
          ? null
          : {
              ...authorMap[reply.authorId.toString()],
              pfp: formatPfpForFrontend(authorMap[reply.authorId.toString()]),
            },
      })),
    };

    return populatedThread;
  },

  async createReply(user: User, threadId: string, data: any) {
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

    // Fetch the updated post to get the new reply count
    const updatedPost = await ForumPostModel.findById(threadId).lean();
    const updatedReplyCount = updatedPost ? updatedPost.replies.length : 0;

    const populatedReply = {
      ...newReply.toObject(),
      author: {
        ...authorProfile,
        pfp: formatPfpForFrontend(authorProfile),
      },
    };

    io.to(threadId).emit("new_reply", populatedReply);
    console.log(
      "Emitting new_reply event to thread:",
      threadId,
      populatedReply.content,
    );

    // Emit a global event for reply count update
    io.emit("forum_reply_count_updated", {
      threadId: threadId,
      replyCount: updatedReplyCount,
    });
    console.log(
      "Emitting forum_reply_count_updated for thread:",
      threadId,
      "new count:",
      updatedReplyCount,
    );

    return populatedReply;
  },
};
