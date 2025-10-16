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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !token) return;

    setIsSubmitting(true);
    try {
      await createForumPost({ title, topic, content, isAnonymous }, token);
      onClose();
    } catch (error) {
      console.error("Failed to create post:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  const topics = [
    "Mathematics",
    "Programming",
    "Linear Programming",
    "Database Development",
    "Web Programming",
    "Computer Architecture",
    "Statistics",
    "Software Testing",
    "Network Development",
    "Machine Learning",
  ];

  return (
    <div className="create-post-modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()} data-cy="create-post-modal">
        <div className="create-post-modal-header">
          <h2>
            <i className="fas fa-edit"></i>
            Create New Post
          </h2>
          <button className="create-post-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="create-post-modal-body">
          <form className="create-post-form" onSubmit={handleSubmit}>
            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <i className="fas fa-heading"></i>
                Title
              </label>
              <input
                type="text"
                name="title"
                className="form-control-enhanced"
                placeholder="Enter a clear, descriptive title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                data-cy="post-title-input"
              />
              <div className="char-counter">{title.length}/200</div>
            </div>

            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <i className="fas fa-tag"></i>
                Topic
              </label>
              <select
                name="topic"
                className="form-control-enhanced select-enhanced"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                data-cy="post-topic-select"
              >
                {topics.map((topicOption) => (
                  <option key={topicOption} value={topicOption}>
                    {topicOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <i className="fas fa-align-left"></i>
                Content
              </label>
              <textarea
                name="content"
                className="form-control-enhanced textarea-enhanced"
                placeholder="Describe your question or topic in detail..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={2000}
                data-cy="post-content-textarea"
              />
              <div className="char-counter">{content.length}/2000</div>
            </div>

            <div
              className="checkbox-group-enhanced"
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              <input
                type="checkbox"
                className="checkbox-enhanced"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span className="checkbox-label-enhanced">Post Anonymously</span>
            </div>
          </form>
        </div>

        <div className="create-post-modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn-submit ${isSubmitting ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            data-cy="submit-post-btn"
          >
            {isSubmitting ? "" : "Submit Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
