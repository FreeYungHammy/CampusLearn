import React, { useState } from "react";
import { Link } from "react-router-dom";

const Forum = () => {
  const [topics, setTopics] = useState([
    { id: 1, upvoted: false, upvotes: 8 },
    { id: 2, upvoted: true, upvotes: 15 },
    { id: 3, upvoted: false, upvotes: 32 },
  ]);

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

  return (
    <div className="content-view" id="forum-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-comments"></i>Discussion Forum
        </h2>
        <a href="#" className="btn btn-primary">
          <i className="fas fa-plus"></i> New Topic
        </a>
      </div>
      <div className="forum-container">
        <div className="forum-header">
          <div className="forum-filters">
            <select className="forum-filter">
              <option>All Subjects</option>
              <option>Mathematics</option>
              <option>Computer Science</option>
              <option>Business</option>
            </select>
            <select className="forum-filter">
              <option>Newest First</option>
              <option>Most Active</option>
              <option>Most Upvoted</option>
            </select>
          </div>
          <a href="#" className="btn btn-outline">
            View Past Posts
          </a>
        </div>
        <div className="forum-topics">
          <Link to="/forum/1" className="forum-topic" data-topic-id="1">
            <div className="topic-header">
              <div>
                <div className="topic-title">
                  How to approach BIT project planning?
                </div>
                <div className="topic-meta">
                  <span>
                    <i className="far fa-clock"></i> 2 hours ago
                  </span>
                  <span>
                    <i className="fas fa-layer-group"></i> Mathematics
                  </span>
                  <span>
                    <i className="fas fa-comment"></i> 12 replies
                  </span>
                  <span>
                    <button
                      className={`upvote-btn ${topics.find((t) => t.id === 1).upvoted ? "upvoted" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleUpvote(1);
                      }}
                    >
                      <i className="fas fa-chevron-up"></i>{" "}
                      {topics.find((t) => t.id === 1).upvotes} upvotes
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div className="topic-content">
              <p>
                I'm struggling with planning my BIT project. Any tips on how to
                break down the requirements and create a timeline? I've looked
                at the project guidelines but I'm still unsure about the best
                approach for the database design phase.
              </p>
            </div>
            <div className="topic-author">
              <div className="author-avatar">A</div>
              <div className="author-name anonymous">Anonymous</div>
            </div>
          </Link>
          <Link to="/forum/2" className="forum-topic" data-topic-id="2">
            <div className="topic-header">
              <div>
                <div className="topic-title">BCom Finance Module Tips</div>
                <div className="topic-meta">
                  <span>
                    <i className="far fa-clock"></i> 1 day ago
                  </span>
                  <span>
                    <i className="fas fa-layer-group"></i> Business
                  </span>
                  <span>
                    <i className="fas fa-comment"></i> 5 replies
                  </span>
                  <span>
                    <button
                      className={`upvote-btn ${topics.find((t) => t.id === 2).upvoted ? "upvoted" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleUpvote(2);
                      }}
                    >
                      <i className="fas fa-chevron-up"></i>{" "}
                      {topics.find((t) => t.id === 2).upvotes} upvotes
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div className="topic-content">
              <p>
                Anyone have study tips for the advanced finance module? The
                concepts are getting complex and I could use some guidance on
                the best resources for understanding financial modeling
                techniques. The textbook seems quite dense.
              </p>
            </div>
            <div className="topic-author">
              <div className="author-avatar">M</div>
              <div className="author-name">Michael</div>
            </div>
          </Link>
          <Link to="/forum/3" className="forum-topic" data-topic-id="3">
            <div className="topic-header">
              <div>
                <div className="topic-title">
                  Python vs JavaScript for Web Development
                </div>
                <div className="topic-meta">
                  <span>
                    <i className="far fa-clock"></i> 3 days ago
                  </span>
                  <span>
                    <i className="fas fa-layer-group"></i> Computer Science
                  </span>
                  <span>
                    <i className="fas fa-comment"></i> 24 replies
                  </span>
                  <span>
                    <button
                      className={`upvote-btn ${topics.find((t) => t.id === 3).upvoted ? "upvoted" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleUpvote(3);
                      }}
                    >
                      <i className="fas fa-chevron-up"></i>{" "}
                      {topics.find((t) => t.id === 3).upvotes} upvotes
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div className="topic-content">
              <p>
                I'm starting a new web project and trying to decide between
                Python/Django and JavaScript/Node.js for the backend. What are
                the pros and cons of each for a medium-sized e-commerce
                application? Any experiences with both would be appreciated.
              </p>
            </div>
            <div className="topic-author">
              <div className="author-avatar">S</div>
              <div className="author-name">Sarah</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forum;
