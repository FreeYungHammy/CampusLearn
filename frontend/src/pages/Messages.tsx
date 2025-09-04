import React, { useState } from "react";
import { useSocket } from "../hooks/useSocket.ts";

// MOCK DATA FOR TESTING
const currentUser = "User_A"; // Change to 'User_B' in a second browser tab
const recipientUser = "User_B";

const conversations = {
  [recipientUser]: {
    name: "Sarah Wilson",
    role: "Mathematics Tutor",
    avatar: "SW",
  },
};

const Messages = () => {
  const { messages, sendMessage } = useSocket(currentUser);
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim() === "") return;
    sendMessage(recipientUser, message);
    setMessage("");
  };

  const activeConversationDetails = conversations[recipientUser];

  return (
    <div className="content-view" id="messages-view">
      <h2 className="section-title">
        <i className="fas fa-envelope"></i> Messages
      </h2>
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-search">
            <input type="text" placeholder="Search conversations..." />
          </div>
          <div className="chat-list">
            <div className={`chat-item active`}>
              <div className="chat-avatar">
                {activeConversationDetails.avatar}
              </div>
              <div className="chat-details">
                <div className="chat-name">
                  {activeConversationDetails.name}
                </div>
                <div className="chat-preview">
                  {activeConversationDetails.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main chat */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-avatar">
              {activeConversationDetails.avatar}
            </div>
            <div className="chat-details">
              <div className="chat-name">{activeConversationDetails.name}</div>
              <div className="chat-preview">Online</div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${
                  msg.senderId === currentUser ? "sent" : "received"
                }`}
              >
                <div className="message-content">
                  <p>{msg.content}</p>
                </div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button className="send-btn" onClick={handleSendMessage}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
