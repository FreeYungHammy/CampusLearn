
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCourseVideos, getVideoUrl } from "../services/videoApi";
import { useAuthStore } from "../store/authStore";

interface Video {
  id: string;
  description: string;
  duration: number;
  createdAt: string;
  uploaderId: string;
}

const CourseVideos: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchVideos = async () => {
      if (courseId && token) {
        try {
          const videoData = await getCourseVideos(courseId, token);
          setVideos(videoData);
        } catch (error) {
          console.error("Error fetching videos:", error);
        }
      }
    };

    fetchVideos();
  }, [courseId, token]);

  const handleVideoSelect = async (videoId: string) => {
    if (token) {
      try {
        const { url } = await getVideoUrl(videoId, token);
        setSelectedVideoUrl(url);
      } catch (error) {
        console.error("Error fetching video URL:", error);
      }
    }
  };

  return (
    <div>
      <h2>Videos for Course {courseId}</h2>
      <div>
        <h3>Available Videos</h3>
        <ul>
          {videos.map((video) => (
            <li key={video.id} onClick={() => handleVideoSelect(video.id)}>
              {video.description || video.id}
            </li>
          ))}
        </ul>
      </div>
      {selectedVideoUrl && (
        <div>
          <h3>Now Playing</h3>
          <video controls src={selectedVideoUrl} width="600">
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default CourseVideos;
