// CreatePostModal.tsx - Enhanced Version
import React, { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log({ title, topic, content, isAnonymous });
    setIsSubmitting(false);
    onClose();
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
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
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
                className="form-control-enhanced"
                placeholder="Enter a clear, descriptive title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
              <div className="char-counter">{title.length}/200</div>
            </div>

            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <i className="fas fa-tag"></i>
                Topic
              </label>
              <select
                className="form-control-enhanced select-enhanced"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
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
                className="form-control-enhanced textarea-enhanced"
                placeholder="Describe your question or topic in detail..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={2000}
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
            type="button"
            className={`btn-submit ${isSubmitting ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
          >
            {isSubmitting ? "" : "Submit Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
