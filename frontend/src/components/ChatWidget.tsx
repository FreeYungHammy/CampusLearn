import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { botpressApi } from "@/services/botpressApi";
import "./ChatWidget.css";

export default function ChatWidget() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const { isOpen, messages, toggleChat, closeChat, addMessage, resetChat } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousUserId = useRef<string | null>(null);

  const hiddenRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  const shouldHide = !user || hiddenRoutes.includes(pathname.toLowerCase());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset chat when user changes (logs out or logs in as different user)
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // If user changed (including logout), reset the chat
    if (previousUserId.current !== currentUserId) {
      resetChat();
      previousUserId.current = currentUserId;
    }
  }, [user?.id, resetChat]);

  // Don't show on hidden routes
  if (shouldHide) return null;

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.id) return;

    const userMessage = inputText.trim();
    
    // Add user message
    addMessage({
      text: userMessage,
      isUser: true,
    });

    setInputText("");
    setIsTyping(true);

    try {
      // Send message to Botpress
      const response = await botpressApi.sendMessage(userMessage, user.id);
      
      // Add Botpress response
      addMessage({
        text: response.response,
        isUser: false,
      });
    } catch (error) {
      console.error("Error sending message to Botpress:", error);
      
      // Fallback response if Botpress fails
      addMessage({
        text: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.",
        isUser: false,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-widget-container">
      {/* Floating Chat Bubble */}
      <button
        onClick={toggleChat}
        className="chat-bubble"
        aria-label="Toggle chat"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
      </button>

      {/* Chat Window - Pops up above the bubble */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-content">
              <h3>CampusLearn Assistant</h3>
              <p>We're here to help!</p>
            </div>
            <button
              onClick={closeChat}
              className="chat-close-btn"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.isUser ? 'user' : 'assistant'}`}
              >
                <div className="chat-message-bubble">
                  {message.text}
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="chat-typing">
                <div className="chat-typing-bubble">
                  <div className="chat-typing-dots">
                    <div className="chat-typing-dot"></div>
                    <div className="chat-typing-dot"></div>
                    <div className="chat-typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="chat-input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="chat-send-btn"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

