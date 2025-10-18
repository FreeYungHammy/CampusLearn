
import { gcsService } from "../../services/gcs.service";
import { FileRepo } from "../files/file.repo";
import { FileModel } from "../../schemas/tutorUpload.schema";
import { env } from "../../config/env";

export class VideoService {
  static async getVideosByCourse(courseId: string) {
    // For now, return empty array since we don't have course-based video filtering
    // This would need to be implemented based on your course structure
    return [];
  }

  static async getSignedUrlForVideo(videoId: string) {
    // videoId is actually a fileId in this system
    const file = await FileRepo.findById(videoId);
    if (!file || !file.externalUri) {
      return null;
    }

    const url = await gcsService.getSignedReadUrl(file.externalUri);
    return {
      url,
      expiresIn: env.gcsSignedUrlTtlSeconds,
    };
  }

  static async getVideoCompressionStatus(videoId: string) {
    // videoId is actually a fileId in this system
    const file = await FileRepo.findById(videoId);
    if (!file) {
      return null;
    }

    return {
      compressionStatus: file.compressionStatus || "pending",
      compressedQualities: file.compressedQualities || [],
    };
  }
}
