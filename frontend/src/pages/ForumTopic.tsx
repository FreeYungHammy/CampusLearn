import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getForumThreadById, createForumReply } from "../services/forumApi";
import { useAuthStore } from "../store/authStore";
import { useForumSocket } from "../hooks/useForumSocket";

const ForumTopic = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const socket = useForumSocket(threadId);

  useEffect(() => {
    const fetchThread = async () => {
      if (threadId) {
        try {
          const fetchedThread = await getForumThreadById(threadId);
          setThread(fetchedThread);
        } catch (error) {
          console.error("Failed to fetch thread", error);
        }
      }
    };

    fetchThread();
  }, [threadId]);

  useEffect(() => {
    if (socket) {
      socket.on("new_reply", (newReply) => {
        console.log("Received new_reply event:", newReply);
        setThread((prevThread: any) => ({
          ...prevThread,
          replies: [...prevThread.replies, newReply],
        }));
      });

      return () => {
        socket.off("new_reply");
      };
    }
  }, [socket]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !threadId) return;

    try {
      await createForumReply(
        threadId,
        { content: replyContent, isAnonymous },
        token,
      );
      setReplyContent("");
      setIsAnonymous(false);
      setError(null);
    } catch (err: any) {
      console.error("Failed to create reply", err);
      setError(err.response?.data?.message || "An unexpected error occurred.");
    }
  };

  if (!thread) {
    return <div>Loading...</div>;
  }

  return (
    <div className="forum-container">
      <div className="topic-card">
        <div className="topic-content">
          <div className="topic-header">
            <h2 className="topic-title">{thread.title}</h2>
            <span className="topic-subject">{thread.topic}</span>
          </div>
          <p className="topic-excerpt">{thread.content}</p>
          <div className="topic-meta">
            <div className="topic-author">
              <div className="author-avatar">
                {thread.isAnonymous ? (
                  "A" // Default anonymous avatar initial
                ) : thread.author && thread.author.pfp ? (
                  <img
                    src={`data:${thread.author.pfp.contentType};base64,${thread.author.pfp.data}`}
                    alt="Profile"
                    className="pfp-avatar"
                  />
                ) : thread.author ? (
                  thread.author.name.charAt(0)
                ) : (
                  "A"
                )}
              </div>
              <div className="author-details">
                <span className="author-name">
                  {thread.isAnonymous
                    ? "Anonymous"
                    : thread.author
                      ? thread.author.name
                      : "Anonymous"}
                </span>
                <span className="post-time">
                  {new Date(thread.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="replies-container">
        <h3>Replies</h3>
        {thread.replies.map((reply: any) => (
          <div key={reply._id} className="reply-card">
            <p>{reply.content}</p>
            <div className="topic-meta">
              <div className="topic-author">
                <div className="author-avatar">
                  {reply.isAnonymous ? (
                    "A" // Default anonymous avatar initial
                  ) : reply.author && reply.author.pfp ? (
                    <img
                      src={`data:${reply.author.pfp.contentType};base64,${reply.author.pfp.data}`}
                      alt="Profile"
                      className="pfp-avatar"
                    />
                  ) : reply.author ? (
                    reply.author.name.charAt(0)
                  ) : (
                    "A"
                  )}
                </div>
                <div className="author-details">
                  <span className="author-name">
                    {reply.isAnonymous
                      ? "Anonymous"
                      : reply.author
                        ? reply.author.name
                        : "Anonymous"}
                  </span>
                  <span className="post-time">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="reply-form-container">
        <h3>Add a Reply</h3>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleReplySubmit}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            required
          ></textarea>
          <div>
            <input
              type="checkbox"
              id="reply-anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <label htmlFor="reply-anonymous">Reply Anonymously</label>
          </div>
          <button type="submit">Submit Reply</button>
        </form>
      </div>
    </div>
  );
};

export default ForumTopic;
