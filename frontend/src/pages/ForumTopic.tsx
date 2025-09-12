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
      // The socket will handle updating the UI
      setReplyContent("");
      setIsAnonymous(false);
    } catch (error) {
      console.error("Failed to create reply", error);
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

      <div className="replies-container">
        <h3>Replies</h3>
        {thread.replies.map((reply: any) => (
          <div key={reply._id} className="reply-card">
            <p>{reply.content}</p>
            <div className="topic-meta">
              <div className="topic-author">
                <div className="author-avatar">
                  {reply.author ? reply.author.name.charAt(0) : "A"}
                </div>
                <div className="author-details">
                  <span className="author-name">
                    {reply.author ? reply.author.name : "Anonymous"}
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
