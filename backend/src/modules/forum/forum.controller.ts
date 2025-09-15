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

  async getThreads(req: Request, res: Response) {
    try {
      const threads = await ForumService.getThreads();
      res.status(200).json(threads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getThreadById(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadById(req.params.threadId);
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
};
