import React, { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  getForumThreadById,
  createForumReply,
  voteOnReply,
  deleteForumPost,
  deleteForumReply,
  updateForumPost,
  updateForumReply,
} from "../services/forumApi";
import { useAuthStore } from "../store/authStore";
import { useForumSocket } from "../hooks/useForumSocket";
import PostActions from "../components/forum/PostActions";
import DeleteConfirmationModal from "../components/forum/DeletePostConfirmationModal";
import { isWithinEditWindow, getRemainingEditTime } from "../utils/editWindow";

const ForumTopic = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [thread, setThread] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user, pfpTimestamps, updatePfpTimestamps } = useAuthStore();
  const socket = useForumSocket(threadId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isVoting, setIsVoting] = useState<{ [key: string]: boolean }>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"thread" | "reply" | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
      if (threadId && token) {
        try {
          setIsLoading(true);
          const fetchedThread = await getForumThreadById(threadId, token);

          const timestamps = fetchedThread.replies.reduce(
            (acc: { [userId: string]: number }, reply: any) => {
              if (reply.author && reply.author.pfpTimestamp) {
                acc[reply.author.userId] = reply.author.pfpTimestamp;
              }
              return acc;
            },
            {} as { [userId: string]: number },
          );
          if (fetchedThread.author && fetchedThread.author.pfpTimestamp) {
            timestamps[fetchedThread.author.userId] =
              fetchedThread.author.pfpTimestamp;
          }
          updatePfpTimestamps(timestamps);

          const threadWithVotes = {
            ...fetchedThread,
            replies: fetchedThread.replies.map((reply: any) => ({
              ...reply,
              upvotes: reply.upvotes || 0,
              userVote: reply.userVote || 0,
            })),
          };
          setThread(threadWithVotes);

          // Check if we should automatically open edit mode
          const shouldEdit = searchParams.get("edit") === "true";
          if (
            shouldEdit &&
            user &&
            fetchedThread.author &&
            user.id === fetchedThread.author.userId
          ) {
            setEditingId(fetchedThread._id);
            setEditingContent(fetchedThread.content);
            // Remove the edit parameter from URL after opening edit mode
            navigate(`/forum/${threadId}`, { replace: true });
          }
        } catch (error) {
          console.error("Failed to fetch thread", error);
          setError("Failed to load thread. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchThread();
  }, [threadId, token, searchParams, user, navigate]);

  useEffect(() => {
    if (socket) {
      socket.on("new_reply", (newReply) => {
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

      socket.on("reply_deleted", ({ replyId }) => {
        setThread((prevThread: any) => ({
          ...prevThread,
          replies: prevThread.replies.filter(
            (reply: any) => reply._id !== replyId,
          ),
        }));
      });

      socket.on("thread_deleted", ({ threadId: deletedThreadId }) => {
        if (deletedThreadId === threadId) {
          navigate("/forum");
        }
      });

      socket.on("thread_updated", ({ updatedPost }) => {
        setThread((prevThread: any) => ({
          ...prevThread,
          ...updatedPost,
        }));
      });

      socket.on("reply_updated", ({ updatedReply }) => {
        setThread((prevThread: any) => ({
          ...prevThread,
          replies: prevThread.replies.map((reply: any) =>
            reply._id === updatedReply._id ? updatedReply : reply,
          ),
        }));
      });

      socket.on("vote_updated", ({ targetId, newScore }) => {
        setThread((prevThread: any) => {
          if (!prevThread) return null;

          // Use the authoritative vote count from the database
          const validatedScore = Number(newScore) || 0;

          const updatedThread = {
            ...prevThread,
            upvotes:
              prevThread._id === targetId ? validatedScore : prevThread.upvotes,
          };

          // Update vote count for replies with authoritative score, preserve each user's own vote state
          updatedThread.replies = updatedThread.replies.map((reply: any) => {
            if (reply._id === targetId) {
              console.log(
                `[ForumTopic] Reply vote update: newScore=${validatedScore}`,
              );
              return { ...reply, upvotes: validatedScore };
            }
            return reply;
          });

          return updatedThread;
        });
      });

      return () => {
        socket.off("new_reply");
        socket.off("reply_deleted");
        socket.off("thread_deleted");
        socket.off("thread_updated");
        socket.off("reply_updated");
        socket.off("vote_updated");
      };
    }
  }, [socket, threadId, navigate]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !threadId || isSubmittingReply) return;

    setIsSubmittingReply(true);
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
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplyUpvote = (replyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || isVoting[replyId]) return;

    setIsVoting((prev) => ({ ...prev, [replyId]: true }));

    setThread((prevThread: any) => ({
      ...prevThread,
      replies: prevThread.replies.map((reply: any) => {
        if (reply._id === replyId) {
          const currentVote = reply.userVote;
          let voteChange = 0;
          let newUserVote = 0;

          if (currentVote === 1) {
            voteChange = -1;
            newUserVote = 0;
          } else if (currentVote === -1) {
            voteChange = 2;
            newUserVote = 1;
          } else {
            voteChange = 1;
            newUserVote = 1;
          }
          return {
            ...reply,
            upvotes: reply.upvotes + voteChange,
            userVote: newUserVote,
          };
        }
        return reply;
      }),
    }));

    voteOnReply(replyId, 1, token).catch((err) => {
      console.error("Failed to upvote reply", err);
    });

    setTimeout(() => {
      setIsVoting((prev) => ({ ...prev, [replyId]: false }));
    }, 100);
  };

  const handleReplyDownvote = (replyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || isVoting[replyId]) return;

    setIsVoting((prev) => ({ ...prev, [replyId]: true }));

    setThread((prevThread: any) => ({
      ...prevThread,
      replies: prevThread.replies.map((reply: any) => {
        if (reply._id === replyId) {
          const currentVote = reply.userVote;
          let voteChange = 0;
          let newUserVote = 0;

          if (currentVote === -1) {
            voteChange = 1;
            newUserVote = 0;
          } else if (currentVote === 1) {
            voteChange = -2;
            newUserVote = -1;
          } else {
            voteChange = -1;
            newUserVote = -1;
          }
          return {
            ...reply,
            upvotes: reply.upvotes + voteChange,
            userVote: newUserVote,
          };
        }
        return reply;
      }),
    }));

    voteOnReply(replyId, -1, token).catch((err) => {
      console.error("Failed to downvote reply", err);
    });

    setTimeout(() => {
      setIsVoting((prev) => ({ ...prev, [replyId]: false }));
    }, 100);
  };

  const handleDeleteThread = () => {
    setDeleteType("thread");
    setItemToDelete(threadId || null);
    setDeleteModalOpen(true);
  };

  const handleDeleteReply = (replyId: string) => {
    setDeleteType("reply");
    setItemToDelete(replyId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!token || !itemToDelete || !deleteType) return;
    try {
      if (deleteType === "thread") {
        await deleteForumPost(itemToDelete, token);
        // The socket event will handle UI update and navigation
      } else if (deleteType === "reply") {
        await deleteForumReply(itemToDelete, token);
        // The socket event will handle UI update
      }
      setDeleteModalOpen(false);
      setDeleteType(null);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const handleEditClick = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const handleUpdateSubmit = async () => {
    if (!token || !editingId) return;

    try {
      if (editingId === threadId) {
        await updateForumPost(editingId, { content: editingContent }, token);
      } else {
        await updateForumReply(editingId, { content: editingContent }, token);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to update", error);
    }
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
      <div className="forum-breadcrumb-nav">
        <Link to="/forum" className="forum-breadcrumb-item">
          <i className="fas fa-comments"></i> Forum
        </Link>
        <span className="forum-breadcrumb-separator">/</span>
        <span className="forum-breadcrumb-item active">{thread.title}</span>
      </div>

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
          <div className="topic-body" style={{ paddingTop: "0rem" }}>
            {editingId === thread._id ? (
              <div className="edit-form">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={5}
                />
                <div className="edit-actions">
                  <button onClick={handleCancelEdit} className="btn-ghost">
                    Cancel
                  </button>
                  <button onClick={handleUpdateSubmit} className="btn-primary">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="topic-content-text">{thread.content}</p>
            )}
          </div>
          <div className="topic-meta">
            <div className="meta-stats">
              <span className="stat-item">
                <i className="far fa-comment"></i>
                {thread.replies.length}{" "}
                {thread.replies.length === 1 ? "reply" : "replies"}
              </span>
              <div className="topic-author">
                <div className="author-avatar">
                  {thread.isAnonymous ? (
                    <div className="anonymous-avatar">A</div>
                  ) : thread.author ? (
                    <img
                      src={`${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/api/users/${thread.author.userId}/pfp?t=${pfpTimestamps[thread.author.userId] || 0}`}
                      alt="Profile"
                      className="pfp-avatar"
                    />
                  ) : (
                    <div className="anonymous-avatar">?</div>
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
        <div
          className="topic-actions"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 10,
          }}
        >
          {user &&
            thread.author &&
            user.id === thread.author.userId &&
            (() => {
              const canEdit = isWithinEditWindow(thread.createdAt);
              const remainingTime = getRemainingEditTime(thread.createdAt);

              return (
                <button
                  onClick={() =>
                    canEdit && handleEditClick(thread._id, thread.content)
                  }
                  disabled={!canEdit}
                  className={`edit-btn ${!canEdit ? "disabled" : ""}`}
                  title={
                    canEdit
                      ? remainingTime > 0
                        ? `Edit available for ${remainingTime} more minute${remainingTime !== 1 ? "s" : ""}`
                        : "Edit my post"
                      : "Edit window expired (10 minutes)"
                  }
                >
                  <i className="fas fa-pencil-alt"></i>
                </button>
              );
            })()}
          {((user && thread.author && user.id === thread.author.userId) ||
            (user && user.role === "admin")) && (
            <button onClick={handleDeleteThread} className="delete-btn">
              <i className="fas fa-trash"></i>
            </button>
          )}
        </div>
      </div>

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
                data-cy="reply-textarea"
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingReply}
              data-cy="post-reply-btn"
            >
              {isSubmittingReply ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Submit Reply
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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
                <div className="reply-vote">
                  <button
                    onClick={(e) => handleReplyUpvote(reply._id, e)}
                    className={`upvote-btn ${
                      reply.userVote === 1 ? "upvoted" : ""
                    }`}
                    aria-label="Upvote"
                    disabled={isVoting[reply._id]}
                    data-cy="reply-upvote-btn"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <span className="vote-count" data-cy="reply-vote-count">
                    {reply.upvotes}
                  </span>
                  <button
                    onClick={(e) => handleReplyDownvote(reply._id, e)}
                    className={`downvote-btn ${
                      reply.userVote === -1 ? "downvoted" : ""
                    }`}
                    aria-label="Downvote"
                    disabled={isVoting[reply._id]}
                    data-cy="reply-downvote-btn"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>

                <div className="reply-content" style={{ position: "relative" }}>
                  {/* Edit/Delete buttons positioned at top-right - hide when editing */}
                  {editingId !== reply._id && (
                    <div
                      className="topic-actions"
                      style={{
                        position: "absolute",
                        top: "0",
                        right: "0",
                        zIndex: 20,
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      {user &&
                        reply.author &&
                        user.id === reply.author.userId &&
                        (() => {
                          const canEdit = isWithinEditWindow(reply.createdAt);
                          const remainingTime = getRemainingEditTime(
                            reply.createdAt,
                          );

                          return (
                            <button
                              onClick={() =>
                                canEdit &&
                                handleEditClick(reply._id, reply.content)
                              }
                              disabled={!canEdit}
                              className={`edit-btn ${!canEdit ? "disabled" : ""}`}
                              title={
                                canEdit
                                  ? remainingTime > 0
                                    ? `Edit available for ${remainingTime} more minute${remainingTime !== 1 ? "s" : ""}`
                                    : "Edit my reply"
                                  : "Edit window expired (10 minutes)"
                              }
                            >
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                          );
                        })()}
                      {((user &&
                        reply.author &&
                        user.id === reply.author.userId) ||
                        (user && user.role === "admin")) && (
                        <button
                          onClick={() => handleDeleteReply(reply._id)}
                          className="delete-btn"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Profile details positioned at bottom-right - hide when editing */}
                  {editingId !== reply._id && (
                    <div
                      className="reply-meta"
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        zIndex: 10,
                      }}
                    >
                      <div className="reply-author">
                        <div className="author-avatar small">
                          {reply.isAnonymous ? (
                            <div className="anonymous-avatar">A</div>
                          ) : reply.author ? (
                            <img
                              src={`${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/api/users/${reply.author.userId}/pfp?t=${pfpTimestamps[reply.author.userId] || 0}`}
                              alt="Profile"
                              className="pfp-avatar"
                            />
                          ) : (
                            <div className="anonymous-avatar">?</div>
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
                  )}

                  {/* Content with proper padding to avoid overlap */}
                  <div className="reply-text-content">
                    {editingId === reply._id ? (
                      <div className="edit-form">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={3}
                        />
                        <div className="edit-actions">
                          <button
                            onClick={handleCancelEdit}
                            className="btn-ghost"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateSubmit}
                            className="btn-primary"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{reply.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteType(null);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={`Delete ${deleteType === "thread" ? "Forum Post" : "Reply"}`}
        message={`Are you sure you want to permanently delete this ${deleteType === "thread" ? "forum post" : "reply"}? This action cannot be undone.`}
      />
    </div>
  );
};

export default ForumTopic;
