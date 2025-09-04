import React, { useState } from "react";

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages([...messages, input]);
    setInput("");
  };

  return (
    <div className="content-view" id="messages-view">
      <h2 className="section-title">
        <i className="fas fa-envelope"></i> Messages (Static Test)
      </h2>
      <div className="chat-container">
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-details">
              <div className="chat-name">Test Conversation</div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="placeholder">No messages yet. Type below!</p>
            )}
            {messages.map((msg, index) => (
              <div key={index} className="message sent">
                <div className="message-content">
                  <p>{msg}</p>
                </div>
                <div className="message-time">
                  {new Date().toLocaleTimeString([], {
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
