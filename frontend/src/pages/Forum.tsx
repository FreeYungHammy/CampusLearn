import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatePostModal from "../components/forum/CreatePostModal";
import "../components/forum/CreatePostModal.css";
import { getForumThreads } from "../services/forumApi";
import { useForumSocket } from "../hooks/useForumSocket";

const Forum = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const socket = useForumSocket();

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const fetchedThreads = await getForumThreads();
        setThreads(fetchedThreads);
      } catch (error) {
        console.error("Failed to fetch threads", error);
      }
    };

    fetchThreads();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("new_post", (newPost) => {
        setThreads((prevThreads) => [newPost, ...prevThreads]);
      });

      return () => {
        socket.off("new_post");
      };
    }
  }, [socket]);

  return (
    <div className="forum-container">
      <div className="forum-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-comments"></i> Discussion Forum
          </h1>
          <p>
            Ask questions and get answers from the entire student community.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="new-topic-btn">
          <i className="fas fa-plus"></i> New Topic
        </button>
      </div>

      <div className="topics-list">
        {threads.map((thread) => (
          <div key={thread._id} className="topic-card">
            <div className="topic-content">
              <Link to={`/forum/${thread._id}`} className="topic-link">
                <div className="topic-header">
                  <h2 className="topic-title">{thread.title}</h2>
                  <span className="topic-subject">{thread.topic}</span>
                </div>
                <p className="topic-excerpt">{thread.content}</p>
              </Link>
              <div className="topic-meta">
                <div className="meta-stats">
                  <span className="stat-item">
                    <i className="far fa-comment"></i>
                    {thread.replies.length} replies
                  </span>
                </div>
                <div className="topic-author">
                  <div className="author-avatar">
                    {thread.author ? thread.author.name.charAt(0) : "A"}
                  </div>
                  <div className="author-details">
                    <span className="author-name">
                      {thread.author ? thread.author.name : "Anonymous"}
                    </span>
                    <span className="post-time">
                      {new Date(thread.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="forum-pagination">
        <div className="pagination-info">
          <p>
            Showing <span>{threads.length}</span> results
          </p>
        </div>
      </div>

      {isModalOpen && <CreatePostModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default Forum;
