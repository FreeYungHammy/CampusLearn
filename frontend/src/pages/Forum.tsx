import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatePostModal from "../components/forum/CreatePostModal";
import "../components/forum/CreatePostModal.css";
import {
  getForumThreads,
  voteOnPost,
  deleteForumPost,
  updateForumPost,
} from "../services/forumApi";
import { useForumSocket } from "../hooks/useForumSocket";
import { useAuthStore } from "../store/authStore";
import PostActions from "../components/forum/PostActions";

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

const Forum = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const socket = useForumSocket();
  const { token, user, pfpTimestamps, updatePfpTimestamps } = useAuthStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isVoting, setIsVoting] = useState<{ [key: string]: boolean }>({});

  const [sortBy, setSortBy] = useState("newest"); // 'newest' or 'upvotes'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(""); // For filtering by subject

  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  useEffect(() => {
    const fetchThreads = async (page: number, append: boolean = false) => {
      if (!token) return;
      try {
        const offset = (page - 1) * postsPerPage;
        const { threads: fetchedThreads, totalCount } = await getForumThreads(
          token,
          sortBy,
          searchQuery,
          selectedTopic,
          postsPerPage,
          offset,
        );

        const timestamps = fetchedThreads.reduce(
          (acc, thread) => {
            if (thread.author && thread.author.pfpTimestamp) {
              acc[thread.author.userId] = thread.author.pfpTimestamp;
            }
            return acc;
          },
          {} as { [userId: string]: number },
        );
        updatePfpTimestamps(timestamps);

        const threadsWithVotes = fetchedThreads.map((thread) => ({
          ...thread,
          upvotes: thread.upvotes || 0,
          userVote: thread.userVote || 0,
        }));

        if (append) {
          setThreads((prevThreads) => [...prevThreads, ...threadsWithVotes]);
        } else {
          setThreads(threadsWithVotes);
        }
        setTotalPosts(totalCount);
        setHasMorePosts(threadsWithVotes.length + offset < totalCount);
      } catch (error) {
        console.error("Failed to fetch threads", error);
      }
    };

    // Reset page and fetch first set of threads when filters/sort change
    setCurrentPage(1);
    setThreads([]); // Clear threads to show loading state or new filtered results
    fetchThreads(1);
  }, [token, sortBy, searchQuery, selectedTopic]);

  const handleLoadMore = () => {
    if (hasMorePosts) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      // Fetch and append new threads
      const fetchThreads = async (page: number, append: boolean = false) => {
        if (!token) return;
        try {
          const offset = (page - 1) * postsPerPage;
          const { threads: fetchedThreads, totalCount } = await getForumThreads(
            token,
            sortBy,
            searchQuery,
            selectedTopic,
            postsPerPage,
            offset,
          );

          const timestamps = fetchedThreads.reduce(
            (acc, thread) => {
              if (thread.author && thread.author.pfpTimestamp) {
                acc[thread.author.userId] = thread.author.pfpTimestamp;
              }
              return acc;
            },
            {} as { [userId: string]: number },
          );
          updatePfpTimestamps(timestamps);

          const threadsWithVotes = fetchedThreads.map((thread) => ({
            ...thread,
            upvotes: thread.upvotes || 0,
            userVote: thread.userVote || 0,
          }));

          if (append) {
            setThreads((prevThreads) => [...prevThreads, ...threadsWithVotes]);
          } else {
            setThreads(threadsWithVotes);
          }
          setTotalPosts(totalCount);
          setHasMorePosts(threadsWithVotes.length + offset < totalCount);
        } catch (error) {
          console.error("Failed to fetch threads", error);
        }
      };
      fetchThreads(nextPage, true);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on("new_post", (newPost) => {
        console.log("Received new_post event:", newPost);
        const postWithVotes = {
          ...newPost,
          upvotes: newPost.upvotes || 0,
          userVote: newPost.userVote || 0,
        };
        setThreads((prevThreads) => [postWithVotes, ...prevThreads]);
      });

      socket.on("thread_deleted", ({ threadId }) => {
        setThreads((prevThreads) =>
          prevThreads.filter((thread) => thread._id !== threadId),
        );
      });

      socket.on("thread_updated", ({ updatedPost }) => {
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread._id === updatedPost._id ? updatedPost : thread,
          ),
        );
      });

      socket.on("forum_reply_count_updated", ({ threadId, replyCount }) => {
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread._id === threadId
              ? { ...thread, replies: Array(replyCount).fill(null) }
              : thread,
          ),
        );
      });

      socket.on("vote_updated", ({ targetId, newScore }) => {
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread._id === targetId ? { ...thread, upvotes: newScore } : thread,
          ),
        );
      });

      return () => {
        socket.off("new_post");
        socket.off("thread_deleted");
        socket.off("thread_updated");
        socket.off("forum_reply_count_updated");
        socket.off("vote_updated");
      };
    }
  }, [socket]);

  const handleUpvote = (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || isVoting[threadId]) return;

    setIsVoting((prev) => ({ ...prev, [threadId]: true }));

    setThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread._id === threadId) {
          const currentVote = thread.userVote;
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
            ...thread,
            upvotes: thread.upvotes + voteChange,
            userVote: newUserVote,
          };
        }
        return thread;
      }),
    );

    voteOnPost(threadId, 1, token).catch((err) => {
      console.error("Failed to upvote post", err);
    });

    setTimeout(() => {
      setIsVoting((prev) => ({ ...prev, [threadId]: false }));
    }, 100);
  };

  const handleDownvote = (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || isVoting[threadId]) return;

    setIsVoting((prev) => ({ ...prev, [threadId]: true }));

    setThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread._id === threadId) {
          const currentVote = thread.userVote;
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
            ...thread,
            upvotes: thread.upvotes + voteChange,
            userVote: newUserVote,
          };
        }
        return thread;
      }),
    );

    voteOnPost(threadId, -1, token).catch((err) => {
      console.error("Failed to downvote post", err);
    });

    setTimeout(() => {
      setIsVoting((prev) => ({ ...prev, [threadId]: false }));
    }, 100);
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!token) return;
    try {
      await deleteForumPost(threadId, token);
      // The socket event will handle UI update
    } catch (error) {
      console.error("Failed to delete thread", error);
      // Optionally, show an error to the user
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
      await updateForumPost(editingId, { content: editingContent }, token);
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to update post", error);
    }
  };

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
        <div className="forum-controls">
          <input
            type="text"
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest</option>
            <option value="upvotes">Most Upvoted</option>
          </select>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="topic-select"
          >
            <option value="">All Subjects</option>
            <option value="Programming">Programming</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Linear Programming">Linear Programming</option>
            <option value="Database Development">Database Development</option>
            <option value="Web Programming">Web Programming</option>
            <option value="Computer Architecture">Computer Architecture</option>
            <option value="Statistics">Statistics</option>
            <option value="Software Testing">Software Testing</option>
            <option value="Network Development">Network Development</option>
            <option value="Machine Learning">Machine Learning</option>
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            className="new-topic-btn"
          >
            <i className="fas fa-plus"></i> New Topic
          </button>
        </div>
      </div>

      <div className="topics-list">
        {threads.map((thread) => (
          <div key={thread._id} className="topic-card">
            <div className="topic-vote">
              <button
                onClick={(e) => handleUpvote(thread._id, e)}
                className={`upvote-btn ${thread.userVote === 1 ? "upvoted" : ""}`}
                aria-label="Upvote"
                disabled={isVoting[thread._id]}
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <span className="vote-count">{thread.upvotes}</span>
              <button
                onClick={(e) => handleDownvote(thread._id, e)}
                className={`downvote-btn ${thread.userVote === -1 ? "downvoted" : ""}`}
                aria-label="Downvote"
                disabled={isVoting[thread._id]}
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>

            <div className="topic-content">
              {editingId === thread._id ? (
                <div className="edit-form-full">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={4}
                  />
                  <div className="edit-actions">
                    <button onClick={handleCancelEdit} className="btn-ghost">
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
                <Link to={`/forum/${thread._id}`} className="topic-link">
                  <div className="topic-header">
                    <h2 className="topic-title">{thread.title}</h2>
                    <span
                      className={`topic-subject ${formatSubjectClass(
                        thread.topic,
                      )}`}
                    >
                      {thread.topic}
                    </span>
                  </div>
                  <p className="topic-excerpt">{thread.content}</p>
                </Link>
              )}
              <div className="topic-meta">
                <div className="meta-stats">
                  <span className="stat-item">
                    <i className="far fa-comment"></i>
                    {thread.replies.length} replies
                  </span>
                </div>
                <div className="topic-author">
                  <div className="author-avatar">
                    {thread.isAnonymous ? (
                      "A"
                    ) : thread.author ? (
                      <img
                        src={`/api/users/${thread.author.userId}/pfp?t=${pfpTimestamps[thread.author.userId] || 0}`}
                        alt="Profile"
                        className="pfp-avatar"
                      />
                    ) : (
                      "?"
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
            <div className="topic-actions">
              {user && thread.author && user.id === thread.author.userId && (
                <button onClick={() => handleEditClick(thread._id, thread.content)} className="edit-btn">
                  <i className="fas fa-pencil-alt"></i>
                </button>
              )}
              {(user && thread.author && user.id === thread.author.userId || user && user.role === 'admin') && (
                <button onClick={() => handleDeleteThread(thread._id)} className="delete-btn">
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="forum-pagination">
        <div className="pagination-info">
          <p>
            Showing <span>{threads.length}</span> of <span>{totalPosts}</span>{" "}
            results
          </p>
        </div>
        {hasMorePosts && (
          <button onClick={handleLoadMore} className="load-more-btn">
            Load More Posts
          </button>
        )}
      </div>

      {isModalOpen && <CreatePostModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default Forum;
