
import { type Request, type Response } from "express";
import { VideoService } from "./video.service";

export class VideoController {
  static async getVideosByCourse(req: Request, res: Response) {
    const { courseId } = req.params;
    const videos = await VideoService.getVideosByCourse(courseId);
    res.status(200).json(videos);
  }

  static async getSignedUrlForVideo(req: Request, res: Response) {
    const { videoId } = req.params;
    const result = await VideoService.getSignedUrlForVideo(videoId);
    if (!result) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.status(200).json(result);
  }

  static async getVideoCompressionStatus(req: Request, res: Response) {
    const { videoId } = req.params;
    const result = await VideoService.getVideoCompressionStatus(videoId);
    if (!result) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.status(200).json(result);
  }
}
