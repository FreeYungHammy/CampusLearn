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
      const { sortBy, searchQuery, topic, limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset as string, 10) : undefined;

      const { threads, totalCount } = await ForumService.getThreads(
        user,
        sortBy as string,
        searchQuery as string,
        topic as string,
        parsedLimit,
        parsedOffset,
      );
      res.status(200).json({ threads, totalCount });
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

      console.log(`[voteOnPost] Received vote request: user=${user.id}, thread=${threadId}, vote=${voteType}`);

      if (![1, -1].includes(voteType)) {
        throw new HttpException(400, "Invalid vote type.");
      }

      const updatedPost = await ForumService.castVote(
        user,
        threadId,
        "ForumPost",
        voteType,
      );
      
      console.log(`[voteOnPost] Returning updated post:`, updatedPost);
      res.status(200).json(updatedPost);
    } catch (error: any) {
      console.error(`[voteOnPost] Error:`, error);
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

  async deleteThread(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { threadId } = req.params;
      await ForumService.deleteThread(user, threadId);
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async deleteReply(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { replyId } = req.params;
      await ForumService.deleteReply(user, replyId);
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async updateThread(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { threadId } = req.params;
      const updateData = req.body;
      const updatedThread = await ForumService.updateThread(
        user,
        threadId,
        updateData,
      );
      res.status(200).json(updatedThread);
    } catch (error: any) {
      if (error instanceof HttpException) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred." });
      }
    }
  },

  async updateReply(req: AuthedRequest, res: Response) {
    try {
      const user = req.user as User;
      const { replyId } = req.params;
      const updateData = req.body;
      const updatedReply = await ForumService.updateReply(
        user,
        replyId,
        updateData,
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
