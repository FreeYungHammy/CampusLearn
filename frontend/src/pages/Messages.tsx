import React, { useState } from "react";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useAuthStore } from "@/store/authStore";
import type { SendMessagePayload } from "@/types/ChatMessage";

const Messages: React.FC = () => {
  const [input, setInput] = useState("");
  const chatId = "static-chat-id";
  const { messages, sendMessage } = useChatSocket(chatId);
  const { user } = useAuthStore();

  const handleSend = () => {
    if (!user?.id) return;
    const content = input.trim();
    if (!content) return;
    const payload: SendMessagePayload = { chatId, content, senderId: user.id };
    sendMessage(payload);
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

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${
                  msg.sender._id === user?.id ? "sent" : "received"
                }`}
              >
                <div className="message-content">
                  {msg.sender._id !== user?.id && (
                    <div className="message-sender-name">{msg.sender.name}</div>
                  )}
                  <p>{msg.content}</p>
                </div>
                <div className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
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
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
