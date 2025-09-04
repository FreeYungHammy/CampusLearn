import React from "react";
import { Link, useParams } from "react-router-dom";

const ForumTopic = () => {
  const { topicId } = useParams();

  // In a real app, you would fetch the topic data based on the topicId
  const topic = {
    id: topicId,
    title: "How to approach BIT project planning?",
    meta: '<span><i class="far fa-clock"></i> 2 hours ago</span><span><i class="fas fa-layer-group"></i> Mathematics</span><span><i class="fas fa-comment"></i> 12 replies</span><span><button class="upvote-btn"><i class="fas fa-chevron-up"></i> 8 upvotes</button></span>',
    content:
      "<p>I'm struggling with planning my BIT project. Any tips on how to break down the requirements and create a timeline? I've looked at the project guidelines but I'm still unsure about the best approach for the database design phase.</p>",
  };

  return (
    <div className="content-view" id="forum-thread-view">
      <div className="forum-thread-header">
        <Link to="/forum" className="btn btn-outline btn-sm">
          <i className="fas fa-arrow-left"></i> Back to Forum
        </Link>
        <h2 className="forum-thread-title">{topic.title}</h2>
        <div
          className="forum-thread-meta"
          dangerouslySetInnerHTML={{ __html: topic.meta }}
        ></div>
      </div>
      <div
        className="forum-thread-content"
        dangerouslySetInnerHTML={{ __html: topic.content }}
      ></div>
      <div className="comment-section">
        <h3>Comments</h3>
        <div className="comment">
          <div className="comment-avatar">U</div>
          <div className="comment-body">
            <div className="comment-header">User123</div>
            <div className="comment-content">
              <p>This is a great question! I was wondering the same thing.</p>
            </div>
          </div>
        </div>
        <div className="comment-form">
          <textarea placeholder="Write a comment..."></textarea>
          <div className="anonymous-switch">
            <input type="checkbox" id="anonymous-post" />
            <label htmlFor="anonymous-post">Post anonymously</label>
          </div>
          <button className="btn btn-primary">Post Comment</button>
        </div>
      </div>
    </div>
  );
};

export default ForumTopic;
