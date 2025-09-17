import { type Request, type Response } from "express";
import { type AuthedRequest } from "../../auth/auth.middleware";
import { ForumService } from "./forum.service";
import { type User } from "../../types/User";
import { HttpException } from "../../infra/http/HttpException";

export const ForumController = {
  async createThread(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const post = await ForumService.createThread(user, req.body);
      res.status(201).json(post);
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async getThreads(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const threads = await ForumService.getThreads(user);
      res.status(200).json(threads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getThreadById(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const thread = await ForumService.getThreadById(
        req.params.threadId,
        user,
      );
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      res.status(200).json(thread);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createReply(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const reply = await ForumService.createReply(
        user,
        req.params.threadId,
        req.body,
      );
      res.status(201).json(reply);
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async voteOnPost(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { threadId } = req.params;
      const { voteType } = req.body;

      if (![1, -1].includes(voteType)) {
        throw new HttpException(400, "Invalid vote type.");
      }

      const updatedPost = await ForumService.castVote(
        user,
        threadId,
        "ForumPost",
        voteType,
      );
      res.status(200).json(updatedPost);
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async voteOnReply(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { replyId } = req.params;
      const { voteType } = req.body;

      if (![1, -1].includes(voteType)) {
        throw new HttpException(400, "Invalid vote type.");
      }

      const updatedReply = await ForumService.castVote(
        user,
        replyId,
        "ForumReply",
        voteType,
      );
      res.status(200).json(updatedReply);
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },
};
