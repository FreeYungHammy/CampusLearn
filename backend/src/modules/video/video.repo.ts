
import { VideoModel, type VideoDoc } from "../../schemas/video.schema";

export class VideoRepo {
  static async findByCourseId(courseId: string): Promise<VideoDoc[]> {
    return VideoModel.find({ courseId }).lean();
  }

  static async findById(videoId: string): Promise<VideoDoc | null> {
    return VideoModel.findById(videoId).lean();
  }
}
