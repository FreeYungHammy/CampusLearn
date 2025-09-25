
import { api } from "../lib/api";

export const getCourseVideos = async (courseId: string, token: string) => {
  const response = await api.get(`/videos/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getVideoUrl = async (videoId: string, token: string) => {
  const response = await api.get(`/videos/${videoId}/url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
