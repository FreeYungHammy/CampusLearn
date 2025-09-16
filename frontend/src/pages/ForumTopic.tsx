import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getForumThreadById, createForumReply } from "../services/forumApi";
import { useAuthStore } from "../store/authStore";
import { useForumSocket } from "../hooks/useForumSocket";

const ForumTopic = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();
  const socket = useForumSocket(threadId);

  const formatSubjectClass = (subject: string) => {
    const subjectMap: { [key: string]: string } = {
      Programming: "programming",
      Mathematics: "mathematics",
      "Linear Programming": "linear-programming",
      "Database Development": "database-development",
      "Web Programming": "web-programming",
      "Computer Architecture": "computer-architecture",
      Statistics: "statistics",
      "Software Testing": "software-testing",
      "Network Development": "network-development",
      "Machine Learning": "machine-learning",
    };

    return subjectMap[subject] || "";
  };

  useEffect(() => {
    const fetchThread = async () => {
      if (threadId) {
        try {
          setIsLoading(true);
          const fetchedThread = await getForumThreadById(threadId);
          // Initialize vote counts for replies
          const threadWithVotes = {
            ...fetchedThread,
            replies: fetchedThread.replies.map((reply: any) => ({
              ...reply,
              upvotes: reply.upvotes || 0,
              userVote: reply.userVote || 0, // 0: no vote, 1: upvoted, -1: downvoted
            })),
          };
          setThread(threadWithVotes);
        } catch (error) {
          console.error("Failed to fetch thread", error);
          setError("Failed to load thread. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchThread();
  }, [threadId]);

  useEffect(() => {
    if (socket) {
      socket.on("new_reply", (newReply) => {
        console.log("Received new_reply event:", newReply);
        // Initialize vote data for new replies
        const replyWithVotes = {
          ...newReply,
          upvotes: newReply.upvotes || 0,
          userVote: newReply.userVote || 0,
        };
        setThread((prevThread: any) => ({
          ...prevThread,
          replies: [...prevThread.replies, replyWithVotes],
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

  // Handle upvote action for replies
  const handleReplyUpvote = (replyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setThread((prevThread: any) => ({
      ...prevThread,
      replies: prevThread.replies.map((reply: any) => {
        if (reply._id === replyId) {
          // If already upvoted, remove the vote
          if (reply.userVote === 1) {
            return {
              ...reply,
              upvotes: reply.upvotes - 1,
              userVote: 0,
            };
          }
          // If downvoted, change to upvote (add 2 to account for removing downvote)
          else if (reply.userVote === -1) {
            return {
              ...reply,
              upvotes: reply.upvotes + 2,
              userVote: 1,
            };
          }
          // If no vote, add upvote
          else {
            return {
              ...reply,
              upvotes: reply.upvotes + 1,
              userVote: 1,
            };
          }
        }
        return reply;
      }),
    }));

    // Here you would typically make an API call to persist the vote
    // upvoteReply(replyId);
  };

  // Handle downvote action for replies
  const handleReplyDownvote = (replyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setThread((prevThread: any) => ({
      ...prevThread,
      replies: prevThread.replies.map((reply: any) => {
        if (reply._id === replyId) {
          // If already downvoted, remove the vote
          if (reply.userVote === -1) {
            return {
              ...reply,
              upvotes: reply.upvotes + 1,
              userVote: 0,
            };
          }
          // If upvoted, change to downvote (subtract 2 to account for removing upvote)
          else if (reply.userVote === 1) {
            return {
              ...reply,
              upvotes: reply.upvotes - 2,
              userVote: -1,
            };
          }
          // If no vote, add downvote
          else {
            return {
              ...reply,
              upvotes: reply.upvotes - 1,
              userVote: -1,
            };
          }
        }
        return reply;
      }),
    }));

    // Here you would typically make an API call to persist the vote
    // downvoteReply(replyId);
  };

  if (isLoading) {
    return (
      <div className="forum-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="forum-container">
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error || "Thread not found"}</p>
          <Link to="/forum" className="btn btn-primary">
            <i className="fas fa-arrow-left"></i> Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      {/* Forum-specific Breadcrumb Navigation */}
      <div className="forum-breadcrumb-nav">
        <Link to="/forum" className="forum-breadcrumb-item">
          <i className="fas fa-comments"></i> Forum
        </Link>
        <span className="forum-breadcrumb-separator">/</span>
        <span className="forum-breadcrumb-item active">{thread.title}</span>
      </div>

      {/* Main Thread Content */}
      <div className="topic-card detailed-view">
        <div className="topic-content">
          <div className="topic-header">
            <h1 className="topic-title-main">{thread.title}</h1>
            <span
              className={`topic-subject ${formatSubjectClass(thread.topic)}`}
            >
              {thread.topic}
            </span>
          </div>
          <div className="topic-body">
            <p className="topic-content-text">{thread.content}</p>
          </div>
          <div className="topic-meta detailed">
            <div className="meta-stats">
              <span className="stat-item">
                <i className="far fa-comment"></i>
                {thread.replies.length}{" "}
                {thread.replies.length === 1 ? "reply" : "replies"}
              </span>
            </div>
            <div className="topic-author">
              <div className="author-avatar">
                {thread.isAnonymous ? (
                  <div className="anonymous-avatar">A</div>
                ) : thread.author && thread.author.pfp ? (
                  <img
                    src={`data:${thread.author.pfp.contentType};base64,${thread.author.pfp.data}`}
                    alt="Profile"
                    className="pfp-avatar"
                  />
                ) : thread.author ? (
                  thread.author.name.charAt(0)
                ) : (
                  <div className="anonymous-avatar">A</div>
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

      {/* Reply Form - Now placed above comments */}
      <div className="reply-form-container card">
        <div className="card-header">
          <h3>
            <i className="fas fa-pen"></i> Post a Reply
          </h3>
        </div>
        <div className="card-body">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleReplySubmit} className="comment-form">
            <div className="form-group">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows={5}
                required
                className="form-control"
              ></textarea>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="reply-anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="reply-anonymous" className="checkbox-label">
                Post as Anonymous
              </label>
            </div>
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-paper-plane"></i> Submit Reply
            </button>
          </form>
        </div>
      </div>

      {/* Replies Section */}
      <div className="replies-section">
        <div className="section-header">
          <h3>
            <i className="fas fa-reply"></i>
            {thread.replies.length}{" "}
            {thread.replies.length === 1 ? "Reply" : "Replies"}
          </h3>
        </div>

        {thread.replies.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-comment-slash"></i>
            <p>No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          <div className="replies-list">
            {thread.replies.map((reply: any) => (
              <div key={reply._id} className="reply-card">
                {/* Voting section for replies */}
                <div className="reply-vote">
                  <button
                    onClick={(e) => handleReplyUpvote(reply._id, e)}
                    className={`upvote-btn ${reply.userVote === 1 ? "upvoted" : ""}`}
                    aria-label="Upvote"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <span className="vote-count">{reply.upvotes}</span>
                  <button
                    onClick={(e) => handleReplyDownvote(reply._id, e)}
                    className={`downvote-btn ${reply.userVote === -1 ? "downvoted" : ""}`}
                    aria-label="Downvote"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>

                <div className="reply-content">
                  <p>{reply.content}</p>
                </div>
                <div className="reply-meta">
                  <div className="reply-author">
                    <div className="author-avatar small">
                      {reply.isAnonymous ? (
                        <div className="anonymous-avatar">A</div>
                      ) : reply.author && reply.author.pfp ? (
                        <img
                          src={`data:${reply.author.pfp.contentType};base64,${reply.author.pfp.data}`}
                          alt="Profile"
                          className="pfp-avatar"
                        />
                      ) : reply.author ? (
                        reply.author.name.charAt(0)
                      ) : (
                        <div className="anonymous-avatar">A</div>
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
        )}
      </div>
    </div>
  );
};

export default ForumTopic;
