import React, { useState } from "react";
import { createForumPost } from "../../services/forumApi";
import { useAuthStore } from "../../store/authStore";
import "./CreatePostModal.css";

interface CreatePostModalProps {
  onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Math");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { token } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      // Handle case where user is not authenticated
      return;
    }
    try {
      await createForumPost({ title, topic, content, isAnonymous }, token);
      onClose();
      // Optionally, trigger a refresh of the forum posts
    } catch (error) {
      console.error("Failed to create post", error);
      // Handle error state in the modal
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Post</h2>
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
              <option value="Math">Math</option>
              <option value="Programming">Programming</option>
              <option value="Databases">Databases</option>
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
            <button type="submit" className="btn-submit">
              Submit Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
