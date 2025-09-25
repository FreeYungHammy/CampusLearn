
import { gcsService } from "../../services/gcs.service";
import { VideoRepo } from "./video.repo";
import { env } from "../../config/env";

export class VideoService {
  static async getVideosByCourse(courseId: string) {
    const videos = await VideoRepo.findByCourseId(courseId);
    return videos.map((v) => ({
      id: v._id.toString(),
      description: v.description,
      duration: v.duration,
      createdAt: v.createdAt,
      uploaderId: v.uploaderId,
    }));
  }

  static async getSignedUrlForVideo(videoId: string) {
    const video = await VideoRepo.findById(videoId);
    if (!video) {
      return null;
    }

    const url = await gcsService.getSignedReadUrl(video.bucketPath);
    return {
      url,
      expiresIn: env.gcsSignedUrlTtlSeconds,
    };
  }
}
