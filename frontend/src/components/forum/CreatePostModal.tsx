import React, { useState } from "react";
import { createForumPost } from "../../services/forumApi";
import { useAuthStore } from "../../store/authStore";
import "./CreatePostModal.css";

interface CreatePostModalProps {
  onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Mathematics");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("You must be logged in to create a post.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createForumPost({ title, topic, content, isAnonymous }, token);
      onClose();
    } catch (err: any) {
      console.error("Failed to create post", err);
      setError(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Post</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="topic">Topic</label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Programming">Programming</option>
              <option value="Database Development">Database Development</option>
              <option value="Linear Programming">Linear Programming</option>
              <option value="Web Programming">Web Programming</option>
              <option value="Computer Architecture">
                Computer Architecture
              </option>
              <option value="Statistics">Statistics</option>
              <option value="Software Testing">Software Testing</option>
              <option value="Network Development">Network Development</option>
              <option value="Machine Learning">Machine Learning</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="form-group-checkbox">
            <input
              id="anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <label htmlFor="anonymous">Post Anonymously</label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
