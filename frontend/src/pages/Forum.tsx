import React, { useState } from "react";
import { Link } from "react-router-dom";

const Forum = () => {
  const [topics, setTopics] = useState([
    {
      id: 1,
      upvoted: false,
      upvotes: 8,
      title: "How to approach BIT project planning?",
      subject: "Mathematics",
      time: "2 hours ago",
      replies: 12,
      content:
        "I'm struggling with planning my BIT project. Any tips on how to break down the requirements and create a timeline? I've looked at the project guidelines but I'm still unsure about the best approach for the database design phase.",
      author: "Anonymous",
      authorInitial: "A",
      tags: ["project planning", "database design", "BIT"],
      views: 124,
      lastActivity: "10 minutes ago",
    },
    {
      id: 2,
      upvoted: true,
      upvotes: 15,
      title: "BCom Finance Module Tips",
      subject: "Business",
      time: "1 day ago",
      replies: 8,
      content:
        "Anyone have study tips for the advanced finance module? The concepts are getting complex and I could use some guidance on the best resources for understanding financial modeling techniques. The textbook seems quite dense.",
      author: "Michael",
      authorInitial: "M",
      tags: ["finance", "study tips", "BCom"],
      views: 98,
      lastActivity: "15 minutes ago",
    },
    {
      id: 3,
      upvoted: false,
      upvotes: 32,
      title: "Python vs JavaScript for Web Development",
      subject: "Computer Science",
      time: "3 days ago",
      replies: 24,
      content:
        "I'm starting a new web project and trying to decide between Python/Django and JavaScript/Node.js for the backend. What are the pros and cons of each for a medium-sized e-commerce application? Any experiences with both would be appreciated.",
      author: "Sarah",
      authorInitial: "S",
      tags: ["python", "javascript", "web development"],
      views: 376,
      lastActivity: "25 minutes ago",
    },
  ]);

  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const toggleUpvote = (id) => {
    setTopics(
      topics.map((topic) =>
        topic.id === id
          ? {
              ...topic,
              upvoted: !topic.upvoted,
              upvotes: topic.upvoted ? topic.upvotes - 1 : topic.upvotes + 1,
            }
          : topic,
      ),
    );
  };

  const filteredTopics = topics
    .filter(
      (topic) =>
        filter === "all" ||
        topic.subject.toLowerCase() === filter.toLowerCase(),
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.time) - new Date(a.time);
      if (sortBy === "active") return b.replies - a.replies;
      if (sortBy === "upvoted") return b.upvotes - a.upvotes;
      return 0;
    });

  return (
    <div className="forum-container">
      {/* Header */}
      <div className="forum-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-comments"></i> Discussion Forum
          </h1>
          <p>
            Ask questions and get answers from the entire student community.
          </p>
        </div>
        <Link to="/new-topic" className="new-topic-btn">
          <i className="fas fa-plus"></i> New Topic
        </Link>
      </div>

      {/* Filters and Sorting */}
      <div className="forum-controls">
        <div className="controls-left">
          <span className="filter-label">Filter by:</span>
          {["All Subjects", "Mathematics", "Computer Science", "Business"].map(
            (subject) => (
              <button
                key={subject}
                onClick={() =>
                  setFilter(
                    subject === "All Subjects" ? "all" : subject.toLowerCase(),
                  )
                }
                className={`subject-filter ${filter === (subject === "All Subjects" ? "all" : subject.toLowerCase()) ? "active" : ""}`}
              >
                {subject}
              </button>
            ),
          )}
        </div>

        <div className="controls-right">
          <div className="sort-container">
            <span className="sort-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="active">Most Active</option>
              <option value="upvoted">Most Upvoted</option>
            </select>
          </div>

          <button className="view-past-btn">View Past Posts</button>
        </div>
      </div>

      {/* Topics List */}
      <div className="topics-list">
        {filteredTopics.map((topic) => (
          <div key={topic.id} className="topic-card">
            <div className="topic-vote">
              <button
                onClick={() => toggleUpvote(topic.id)}
                className={`upvote-btn ${topic.upvoted ? "upvoted" : ""}`}
              >
                <i className="fas fa-chevron-up"></i>
              </button>
              <span className="vote-count">{topic.upvotes}</span>
            </div>

            <div className="topic-content">
              <Link to={`/forum/${topic.id}`} className="topic-link">
                <div className="topic-header">
                  <h2 className="topic-title">{topic.title}</h2>
                  <span className="topic-subject">{topic.subject}</span>
                </div>

                <p className="topic-excerpt">{topic.content}</p>

                <div className="topic-tags">
                  {topic.tags.map((tag) => (
                    <span key={tag} className="topic-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>

              <div className="topic-meta">
                <div className="meta-stats">
                  <span className="stat-item">
                    <i className="far fa-comment"></i>
                    {topic.replies} replies
                  </span>
                  <span className="stat-item">
                    <i className="far fa-eye"></i>
                    {topic.views} views
                  </span>
                  <span className="stat-item">
                    <i className="far fa-clock"></i>
                    Last activity: {topic.lastActivity}
                  </span>
                </div>

                <div className="topic-author">
                  <div className="author-avatar">{topic.authorInitial}</div>
                  <div className="author-details">
                    <span className="author-name">{topic.author}</span>
                    <span className="post-time">{topic.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="forum-pagination">
        <div className="pagination-info">
          <p>
            Showing <span>1</span> to <span>3</span> of <span>3</span> results
          </p>
        </div>
        <div className="pagination-controls">
          <button className="pagination-btn">
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="pagination-btn active">1</button>
          <button className="pagination-btn">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forum;
