import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreatePostModal from "../components/forum/CreatePostModal";
import DeleteConfirmationModal from "../components/forum/DeletePostConfirmationModal";
import "../components/forum/CreatePostModal.css";
import {
  getForumThreads,
  voteOnPost,
  deleteForumPost,
  updateForumPost,
} from "../services/forumApi";
import { useForumSocket } from "../hooks/useForumSocket";
import { useAuthStore } from "../store/authStore";
import { SocketManager } from "../services/socketManager";
import PostActions from "../components/forum/PostActions";
import { isWithinEditWindow, getRemainingEditTime } from "../utils/editWindow";
import PageHeader from "../components/PageHeader";

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
  const navigate = useNavigate();

  const [isVoting, setIsVoting] = useState<{ [key: string]: boolean }>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState("newest"); // 'newest' or 'upvotes'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]); // For filtering by subjects (multiple)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Advanced Filter State
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");

  // Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Filter options
  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "upvotes", label: "Most Upvoted" },
    { value: "replies", label: "Most Replies" },
  ];

  // Dropdown toggle function
  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeDropdown]);

  // Helper functions for icons
  const getSortIcon = (sortValue: string) => {
    const iconMap: { [key: string]: string } = {
      newest: "fas fa-clock",
      upvotes: "fas fa-thumbs-up",
      replies: "fas fa-comments",
    };
    return <i className={iconMap[sortValue] || "fas fa-sort"}></i>;
  };

  const getSubjectIcon = (subject: string) => {
    const iconMap: { [key: string]: string } = {
      Mathematics: "fas fa-calculator",
      Programming: "fas fa-code",
      "Computer Architecture": "fas fa-microchip",
      "Database Development": "fas fa-database",
      "Web Programming": "fas fa-globe",
      "Linear Programming": "fas fa-chart-line",
      Statistics: "fas fa-chart-bar",
      "Software Testing": "fas fa-bug",
      "Network Development": "fas fa-network-wired",
      "Machine Learning": "fas fa-brain",
    };
    return <i className={iconMap[subject] || "fas fa-book"}></i>;
  };

  // Initialize available subjects
  useEffect(() => {
    const subjects = [
      "Programming",
      "Mathematics",
      "Linear Programming",
      "Database Development",
      "Web Programming",
      "Computer Architecture",
      "Statistics",
      "Software Testing",
      "Network Development",
      "Machine Learning",
    ];
    setAvailableSubjects(subjects);
  }, []);

  const fetchAndSetThreads = async (page: number, append: boolean = false) => {
    if (!token) return;
    try {
      const offset = (page - 1) * postsPerPage;
      const { threads: fetchedThreads, totalCount } = await getForumThreads(
        token,
        sortBy,
        searchQuery,
        selectedSubjects.length > 0 ? selectedSubjects.join(",") : "",
        postsPerPage,
        offset,
      );

      const timestamps = fetchedThreads.reduce(
        (acc: { [userId: string]: number }, thread: any) => {
          if (thread.author && thread.author.pfpTimestamp) {
            acc[thread.author.userId] = thread.author.pfpTimestamp;
          }
          return acc;
        },
        {} as { [userId: string]: number },
      );
      updatePfpTimestamps(timestamps);

      const threadsWithVotes = fetchedThreads.map((thread: any) => ({
        ...thread,
        upvotes: thread.upvotes || 0,
        userVote: thread.userVote || 0,
      }));

      console.log("Fetched threads with votes:", threadsWithVotes.map((t: any) => ({ id: t._id, upvotes: t.upvotes, userVote: t.userVote })));
      console.log("Vote counts breakdown:", threadsWithVotes.map((t: any) => ({ id: t._id, upvotes: t.upvotes, title: t.title?.substring(0, 20) })));

      if (append) {
        setThreads((prevThreads) => [...prevThreads, ...threadsWithVotes]);
      } else {
        console.log("Setting threads state:", threadsWithVotes.map((t: any) => ({ id: t._id, upvotes: t.upvotes, userVote: t.userVote })));
        setThreads(threadsWithVotes);
      }
      setTotalPosts(totalCount);
      setHasMorePosts(threadsWithVotes.length + offset < totalCount);
    } catch (error) {
      console.error("Failed to fetch threads", error);
    }
  };

  useEffect(() => {
    // Reset page and fetch first set of threads when filters/sort change
    setCurrentPage(1);
    setThreads([]); // Clear threads to show loading state or new filtered results
    fetchAndSetThreads(1);
  }, [token, sortBy, searchQuery, selectedSubjects]);

  const handleLoadMore = () => {
    if (hasMorePosts) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchAndSetThreads(nextPage, true);
    }
  };

  useEffect(() => {
    // Register forum event handlers with the centralized socket manager
    SocketManager.registerHandlers({
      global: {
        onNewPost: (newPost) => {
          console.log("Received new_post event:", newPost);
          // Re-fetch the first page to ensure list is up-to-date with filters
          fetchAndSetThreads(1);
        },
        onThreadDeleted: ({ threadId }) => {
          console.log("Received thread_deleted event:", threadId);
          // Re-fetch the first page to ensure list is up-to-date
          fetchAndSetThreads(1);
        },
        onThreadUpdated: ({ updatedPost }) => {
          setThreads((prevThreads) =>
            prevThreads.map((thread) =>
              thread._id === updatedPost._id ? updatedPost : thread,
            ),
          );
        },
        onForumReplyCountUpdated: ({ threadId, replyCount }) => {
          setThreads((prevThreads) =>
            prevThreads.map((thread) =>
              thread._id === threadId
                ? { ...thread, replies: Array(replyCount).fill(null) }
                : thread,
            ),
          );
        },
        onVoteUpdated: ({ targetId, newScore, userVote }) => {
          console.log("Received vote update:", { targetId, newScore, userVote });
          setThreads((prevThreads) =>
            prevThreads.map((thread) => {
              if (thread._id === targetId) {
                // Update both the vote count and user's vote state from the server
                return { 
                  ...thread, 
                  upvotes: newScore,
                  userVote: userVote || 0
                };
              }
              return thread;
            }),
          );
        },
      },
    });
  }, []);

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

    voteOnPost(threadId, 1, token)
      .then((response) => {
        console.log("Upvote successful:", response);
        // Update the UI with the server response immediately
        setThreads((prevThreads) =>
          prevThreads.map((thread) => {
            if (thread._id === threadId) {
              return {
                ...thread,
                upvotes: response.upvotes,
                userVote: response.userVote || 0,
              };
            }
            return thread;
          }),
        );
      })
      .catch((err) => {
        console.error("Failed to upvote post", err);
        // Revert the optimistic update on error
        setThreads((prevThreads) =>
          prevThreads.map((thread) => {
            if (thread._id === threadId) {
              const currentVote = thread.userVote;
              let voteChange = 0;
              let newUserVote = 0;

              if (currentVote === 1) {
                voteChange = 1;
                newUserVote = 0;
              } else if (currentVote === -1) {
                voteChange = -2;
                newUserVote = -1;
              } else {
                voteChange = -1;
                newUserVote = 0;
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

    voteOnPost(threadId, -1, token)
      .then((response) => {
        console.log("Downvote successful:", response);
        // Update the UI with the server response immediately
        setThreads((prevThreads) =>
          prevThreads.map((thread) => {
            if (thread._id === threadId) {
              return {
                ...thread,
                upvotes: response.upvotes,
                userVote: response.userVote || 0,
              };
            }
            return thread;
          }),
        );
      })
      .catch((err) => {
        console.error("Failed to downvote post", err);
        // Revert the optimistic update on error
        setThreads((prevThreads) =>
          prevThreads.map((thread) => {
            if (thread._id === threadId) {
              const currentVote = thread.userVote;
              let voteChange = 0;
              let newUserVote = 0;

              if (currentVote === -1) {
                voteChange = -1;
                newUserVote = 0;
              } else if (currentVote === 1) {
                voteChange = 2;
                newUserVote = 1;
              } else {
                voteChange = 1;
                newUserVote = 0;
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
      });

    setTimeout(() => {
      setIsVoting((prev) => ({ ...prev, [threadId]: false }));
    }, 100);
  };

  const handleDeleteThread = (threadId: string) => {
    setThreadToDelete(threadId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteThread = async () => {
    if (!token || !threadToDelete) return;
    try {
      await deleteForumPost(threadToDelete, token);
      // The socket event will handle UI update
      setDeleteModalOpen(false);
      setThreadToDelete(null);
    } catch (error) {
      console.error("Failed to delete thread", error);
      // Optionally, show an error to the user
    }
  };

  const handleEditClick = (id: string, content: string) => {
    // Navigate to the post page with edit parameter
    navigate(`/forum/${id}?edit=true`);
  };

  return (
    <div className="content-view" id="forum-view">
      <PageHeader
        title="Discussion Forum"
        subtitle="Connect with peers, ask questions, and share knowledge"
        icon="fas fa-comments"
      />

      {/* MINIMALISTIC FILTER BAR - GRID LAYOUT */}
      <div className="minimal-filter-bar-grid">
        {/* ROW 1: Filter buttons + Info */}
        <div className="filter-row-1">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeDropdown === "sort" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown("sort");
              }}
            >
              <i className="fas fa-sort"></i>
              Sort By
              <i className="fas fa-chevron-down"></i>
            </button>

            <button
              className={`filter-btn ${activeDropdown === "subjects" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown("subjects");
              }}
            >
              <i className="fas fa-book-open"></i>
              Subjects
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>

          <div className="search-container">
            <input
              type="text"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-info">
            <button
              onClick={() => setIsModalOpen(true)}
              className="new-topic-btn"
              data-cy="new-topic-btn"
            >
              <i className="fas fa-plus"></i> New Topic
            </button>
            {(selectedSubjects.length > 0 || sortBy !== "newest") && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSelectedSubjects([]);
                  setSortBy("newest");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Selected subjects (inside filter bar) */}
        {selectedSubjects.length > 0 && (
          <div className="filter-row-2">
            <div className="selected-subjects-container">
              {selectedSubjects.map((subject) => (
                <div key={subject} className="selected-subject-tag">
                  <span className="subject-name">{subject}</span>
                  <button
                    onClick={() =>
                      setSelectedSubjects((prev) =>
                        prev.filter((s) => s !== subject),
                      )
                    }
                    className="remove-subject-btn"
                    title={`Remove ${subject} filter`}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DROPDOWN MENUS */}
        {activeDropdown === "sort" && (
          <div
            className="dropdown-menu sort-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <i className="fas fa-sort"></i>
              Sort By
              <span className="dropdown-subtitle">Choose sorting method</span>
            </div>
            <div className="dropdown-content">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`dropdown-option ${sortBy === option.value ? "active" : ""}`}
                  onClick={() => {
                    setSortBy(option.value);
                    setActiveDropdown(null);
                  }}
                >
                  <div className="option-icon">{getSortIcon(option.value)}</div>
                  <span className="option-label">{option.label}</span>
                  {sortBy === option.value && <i className="fas fa-check"></i>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeDropdown === "subjects" && (
          <div
            className="dropdown-menu subjects-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <i className="fas fa-book-open"></i>
              Subjects
              <span className="dropdown-subtitle">Select one or more</span>
            </div>
            <div className="dropdown-content">
              <div className="subject-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  className="subject-search-input"
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                />
              </div>

              <div className="subjects-list">
                {availableSubjects
                  .filter((subject) =>
                    subject
                      .toLowerCase()
                      .includes(subjectSearchQuery.toLowerCase()),
                  )
                  .map((subject) => (
                    <button
                      key={subject}
                      className={`subject-option ${selectedSubjects.includes(subject) ? "selected" : ""}`}
                      onClick={() =>
                        setSelectedSubjects((prev) =>
                          prev.includes(subject)
                            ? prev.filter((s) => s !== subject)
                            : [...prev, subject],
                        )
                      }
                    >
                      <span>{subject}</span>
                      {selectedSubjects.includes(subject) && (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
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
                data-cy="upvote-btn"
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <span className="vote-count" data-cy="vote-count">
                {thread.upvotes}
              </span>
              <button
                onClick={(e) => handleDownvote(thread._id, e)}
                className={`downvote-btn ${thread.userVote === -1 ? "downvoted" : ""}`}
                aria-label="Downvote"
                disabled={isVoting[thread._id]}
                data-cy="downvote-btn"
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>

            <div className="topic-content">
              <Link to={`/forum/${thread._id}`} className="topic-link">
                <div className="topic-header">
                  <h2 className="topic-title" data-cy="post-title">
                    {thread.title}
                  </h2>
                  <span
                    className={`topic-subject ${formatSubjectClass(
                      thread.topic,
                    )}`}
                  >
                    {thread.topic}
                  </span>
                </div>
                <div className="topic-excerpt-wrapper">
                  <p className="topic-excerpt">{thread.content}</p>
                </div>
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
                    {thread.isAnonymous ? (
                      "A"
                    ) : thread.author ? (
                      <img
                        src={(() => {
                          const url = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/api/users/${thread.author.userId}/pfp?t=${pfpTimestamps[thread.author.userId] || 0}`;
                          console.log("🖼️ Forum Profile Picture URL:", url);
                          return url;
                        })()}
                        alt="Profile"
                        className="pfp-avatar"
                        onError={(e) => {
                          console.log(
                            "❌ Profile picture failed to load for user:",
                            thread.author.userId,
                          );
                          console.log("❌ Failed URL:", e.currentTarget.src);
                        }}
                        onLoad={() => {
                          console.log(
                            "✅ Profile picture loaded for user:",
                            thread.author.userId,
                          );
                        }}
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

            {/* Edit and Delete buttons positioned at top right of card */}
            <div className="topic-header-actions">
              {user &&
                thread.author &&
                user.id === thread.author.userId &&
                (() => {
                  const canEdit = isWithinEditWindow(thread.createdAt);
                  const remainingTime = getRemainingEditTime(thread.createdAt);

                  return (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        canEdit && handleEditClick(thread._id, thread.content);
                      }}
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteThread(thread._id);
                  }}
                  className="delete-btn"
                >
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

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setThreadToDelete(null);
        }}
        onConfirm={confirmDeleteThread}
        title="Delete Forum Post"
        message="Are you sure you want to permanently delete this forum post? This action cannot be undone."
      />
    </div>
  );
};

export default Forum;
