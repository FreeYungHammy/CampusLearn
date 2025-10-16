import React, { useEffect, useState } from "react";
import { chatApi } from "../../services/chatApi";
import { User } from "../../types/Common";
import { useAuthStore } from "../../store/authStore";

interface ChatListProps {
  onSelectChat: (chatId: string, otherUser: User) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectChat }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser, token } = useAuthStore();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await chatApi.getConversations(currentUser!.id, token!);
        setConversations(data);
      } catch (err) {
        setError("Failed to load conversations.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return <div className="chat-list">Loading conversations...</div>;
  }

  if (error) {
    return <div className="chat-list error-message">{error}</div>;
  }

  return (
    <div className="chat-list">
      <h3 className="chat-list-title">Conversations</h3>
      {conversations.length === 0 ? (
        <p className="chat-list-empty">No conversations yet.</p>
      ) : (
        <ul className="chat-list-items">
          {conversations.map((otherUser) => (
            <li
              key={otherUser.id}
              className="chat-list-item"
              onClick={() => {
                // For simplicity, we'll create a consistent chatId based on user IDs
                // In a real app, you might have a dedicated chat session ID from the backend
                const chatIdentifier = [currentUser?.id, otherUser.id]
                  .sort()
                  .join("-");
                onSelectChat(chatIdentifier, otherUser);
              }}
            >
              <div className="chat-list-item-avatar">
                {/* You can add user profile pictures here */}
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="chat-list-item-info">
                <span className="chat-list-item-name">
                  {otherUser.name} {otherUser.surname}
                </span>
                {/* You can add last message preview here */}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
