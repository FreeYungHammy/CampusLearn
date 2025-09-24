import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useAuthStore } from "@/store/authStore";
import { chatApi, type Conversation } from "@/services/chatApi";
import type { SendMessagePayload, ChatMessage } from "@/types/ChatMessage";
import { format } from "date-fns";
import "./Messages.css"; 

/* ---------- Helpers ---------- */
const getProfilePictureUrl = (userId: string, bust?: number) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
  const cacheBuster = bust ? `?t=${bust}` : "";
  return `${baseUrl}/api/users/${userId}/pfp${cacheBuster}`;
};

const subjectBadgeColor = (subject: string) => {
  const m: Record<string, string> = {
    Mathematics: "bg-blue-500",
    Research: "bg-green-500",
    Programming: "bg-purple-500",
    Business: "bg-yellow-500",
    Statistics: "bg-red-500",
  };
  return m[subject] || "bg-gray-500";
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "Unknown size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const fileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return (
        <svg width="20" height="20" fill="none" aria-label="PDF file" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#e53e3e" strokeWidth="1.5"/>
          <path d="M7 13V7h2.5a1.5 1.5 0 1 1 0 3H7m4 3V7" stroke="#e53e3e" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      );
    case "doc":
    case "docx":
      return (
        <svg width="20" height="20" fill="none" aria-label="Word document" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#2563eb" strokeWidth="1.5"/>
          <path d="M7 7l1.2 6h.1l1.2-4.5L11.7 13h.1l1.2-6" stroke="#2563eb" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      );
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return (
        <svg width="20" height="20" fill="none" aria-label="Image file" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#10b981" strokeWidth="1.5"/>
          <circle cx="7" cy="8" r="1" fill="#10b981"/>
          <path d="M5 15l4-5 3 4 3-4" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      );
    case "mp4":
    case "avi":
    case "mov":
      return (
        <svg width="20" height="20" fill="none" aria-label="Video file" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#f59e42" strokeWidth="1.5"/>
          <polygon points="8,7 14,10 8,13" fill="#f59e42"/>
        </svg>
      );
    case "mp3":
    case "wav":
      return (
        <svg width="20" height="20" fill="none" aria-label="Audio file" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#a21caf" strokeWidth="1.5"/>
          <rect x="7" y="8" width="2" height="5" rx="1" fill="#a21caf"/>
          <path d="M11 10.5a2 2 0 1 1 0 3" stroke="#a21caf" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" fill="none" aria-label="Attachment" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="3" fill="#fff" stroke="#6b7280" strokeWidth="1.5"/>
          <path d="M8 12.5l4-4a1.5 1.5 0 1 0-2-2l-4 4a2.5 2.5 0 1 0 3.5 3.5l4-4" stroke="#6b7280" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      );
  }
};

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userOnlineStatus, setUserOnlineStatus] = useState<Map<string, { isOnline: boolean; lastSeen?: Date }>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentRoomRef = useRef<string | null>(null);

  const { user, token, pfpTimestamps } = useAuthStore();

  const chatId = useMemo(() => {
    if (!selectedConversation || !user?.id) return null;
    return [user.id, selectedConversation.otherUser._id].sort().join("-");
  }, [selectedConversation, user?.id]);

  /* -------- Socket handlers -------- */
  const handleNewMessage = useCallback((newMessage: ChatMessage) => {
    if (chatId && newMessage.chatId === chatId) {
      setMessages((prev) => [...prev, newMessage]);
    }

    setConversations((prev) => {
      const updated = prev.map((c) => {
        const cChatId = user?.id ? [user.id, c.otherUser._id].sort().join("-") : "";
        if (cChatId !== newMessage.chatId) return c;

        const isActive = selectedConversation && selectedConversation._id === c._id;
        return {
          ...c,
          lastMessage: {
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            senderId: newMessage.senderId || newMessage.sender._id,
          },
          unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
        };
      });

      return updated.sort(
        (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      );
    });
  }, [chatId, selectedConversation, user?.id]);

  const handleUserStatusChange = useCallback((userId: string, status: "online" | "offline", lastSeen: Date) => {
    setUserOnlineStatus((prev) => {
      const m = new Map(prev);
      m.set(userId, { isOnline: status === "online", lastSeen });
      return m;
    });
  }, []);

  const { sendMessage, isConnected, joinRoom, leaveRoom } =
    useChatSocket(handleNewMessage, handleUserStatusChange);

  /* -------- Load conversation list -------- */
  useEffect(() => {
      if (!user?.id || !token) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const data = await chatApi.getConversations(user.id, token);
        const sorted = data.sort(
          (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        );
        if (!ac.signal.aborted) {
          setConversations(sorted);
          if (sorted.length > 0) setSelectedConversation((s) => s ?? sorted[0]);
          setError(null);
        }
      } catch {
        if (!ac.signal.aborted) setError("Failed to load conversations");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [user?.id, token]);

  /* -------- Switch room + load messages -------- */
  useEffect(() => {
      if (!chatId || !token) return;

    const loadThread = async () => {
      try {
        setThreadLoading(true);
        const initial = await chatApi.getConversationThread(chatId, token);
        setMessages(initial);
        setError(null);
      } catch (e) {
        console.error("Failed to load messages:", e);
        setMessages([]);
        setError("Failed to load message history");
      } finally {
        setThreadLoading(false);
      }
    };

    if (chatId !== currentRoomRef.current) {
      if (currentRoomRef.current) leaveRoom(currentRoomRef.current);
      joinRoom(chatId);
      currentRoomRef.current = chatId;
      loadThread();
    }

    return () => {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [chatId, token, joinRoom, leaveRoom]);

  /* -------- Auto-scroll on new messages -------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* -------- Mark messages as seen -------- */
  useEffect(() => {
      if (!chatId || !user?.id || !token || !selectedConversation) return;
    if (!isConnected) return;
      if (selectedConversation.unreadCount === 0) return;

    (async () => {
      try {
        await chatApi.markThreadSeen(chatId, user.id, token);
        setConversations((prev) =>
          prev.map((c) => (c._id === selectedConversation._id ? { ...c, unreadCount: 0 } : c))
        );
      } catch (e) {
        console.error("Error marking messages as seen:", e);
      }
    })();
  }, [chatId, user?.id, token, selectedConversation, isConnected]);

  /* -------- Send message (with optional base64 upload) -------- */
  const handleSend = useCallback(() => {
    if (!chatId || !selectedConversation || !user?.id) return;
    const trimmed = input.trim();
    if (!trimmed && !selectedFile) return;

    // Optional: client-side file size guard (10 MB)
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      alert("File too large. Please keep attachments under 10 MB.");
      return;
    }

    const finish = () => {
      setInput("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result || "");
        const upload = {
          data: base64.split(",")[1] || "",
          contentType: selectedFile.type || "application/octet-stream",
          filename: selectedFile.name,
        };
        const payload: SendMessagePayload = {
          chatId,
          content: trimmed || ` ${selectedFile.name}`,
          senderId: user.id,
          receiverId: selectedConversation.otherUser._id,
          upload,
        };
        sendMessage(payload);
        finish();
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    // Only add text message if no file is present
    const payload: SendMessagePayload = {
      chatId,
      content: trimmed,
      senderId: user.id,
      receiverId: selectedConversation.otherUser._id,
    };
    sendMessage(payload);
    finish();
  }, [chatId, input, selectedConversation, selectedFile, sendMessage, user?.id]);

  /* IME-safe Enter to send */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // @ts-ignore
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------- Derived lists -------- */
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const full = `${c.otherUser.profile?.name || ""} ${c.otherUser.profile?.surname || ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [conversations, searchQuery]);

  if (loading) return <div>Loading...</div>;

  return (
    <main className="messages-root">
      <div className="messages-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="title">Messages</h2>
            <div className="search-wrap">
                <input
                  type="text"
                  placeholder="Search conversations..."
                className="search-input"
                  value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search conversations"
              />
              <span className="search-icon">🔎</span>
            </div>
          </div>

          <div className="thread-list">
            {filteredConversations.map((conv) => {
              const isActive = selectedConversation?._id === conv._id;
              const status = userOnlineStatus.get(conv.otherUser._id);
              const pfpBust = pfpTimestamps?.[conv.otherUser._id];

              return (
                <div
                  key={conv._id}
                  className={`message-thread${isActive ? " active" : ""}`}
                  onClick={() => setSelectedConversation(conv)}
                  role="button"
                  aria-label={`Open conversation with ${conv.otherUser.profile?.name || "User"}`}
                >
                  <div className="thread-item">
                    <div className="pfp-wrap">
                      <img
                        src={getProfilePictureUrl(conv.otherUser._id, pfpBust)}
                        alt={`${conv.otherUser.profile?.name || ""} ${conv.otherUser.profile?.surname || ""}`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(
                              `${conv.otherUser.profile?.name || ""} ${conv.otherUser.profile?.surname || ""}`
                            );
                        }}
                      />
                      {status?.isOnline && <span className="status online" />}
                    </div>

                    <div className="thread-body">
                      <div className="thread-top">
                        <h3 className="name">
                          {`${conv.otherUser.profile?.name || "Unknown"} ${conv.otherUser.profile?.surname || "User"}`}
                        </h3>
                        <span className="time">
                          {conv.lastMessage?.createdAt && format(new Date(conv.lastMessage.createdAt), "p")}
                        </span>
                      </div>
                      <p className="snippet">{conv.lastMessage?.content || "No messages yet"}</p>

                      <div className="thread-meta">
                      {conv.otherUser.profile?.subjects?.[0] && (
                        <span
                            className={`badge ${subjectBadgeColor(
                              conv.otherUser.profile.subjects[0]
                            )}`}
                          >
                          {conv.otherUser.profile.subjects[0]}
                        </span>
                      )}
                        {conv.unreadCount > 0 && <span className="unread">{conv.unreadCount}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && !loading && (
              <div className="empty-sidebar">No conversations found</div>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className="chat-panel">
            {selectedConversation ? (
              <>
              {/* Header */}
              <div className="chat-header">
                <div className="header-left">
                  <div className="pfp-wrap small">
                    <img
                      src={getProfilePictureUrl(
                        selectedConversation.otherUser._id,
                        pfpTimestamps?.[selectedConversation.otherUser._id]
                      )}
                      alt={`${selectedConversation.otherUser.profile?.name || ""} ${selectedConversation.otherUser.profile?.surname || ""}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(
                            `${selectedConversation.otherUser.profile?.name || ""} ${selectedConversation.otherUser.profile?.surname || ""}`
                          );
                      }}
                    />
                    {userOnlineStatus.get(selectedConversation.otherUser._id)?.isOnline && (
                      <span className="status online small" />
                    )}
                  </div>
                    <div>
                    <div className="header-name">
                      {`${selectedConversation.otherUser.profile?.name || "Unknown"} ${selectedConversation.otherUser.profile?.surname || "User"}`}
                    </div>
                    <div className="header-sub">

                      {(() => {
                        const status = userOnlineStatus.get(selectedConversation.otherUser._id);
                        if (status?.isOnline) return <span className="online-text">Online</span>;
                        if (status?.lastSeen) return <span className="muted">Last seen {format(status.lastSeen, "p")}</span>;
                        return <span className="muted">Offline</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="header-actions">
                  <button className="action-button" aria-label="Call">
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122L9.804 10.5a.678.678 0 0 1-.55-.173L7.173 8.246a.678.678 0 0 1-.173-.55l.122-.58a.678.678 0 0 0-.122-.58L5.328 3.654z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button className="action-button" aria-label="Video">
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button className="action-button" aria-label="More">
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Thread */}
              <div className="chat-scroll">
                {threadLoading && messages.length === 0 ? (
                  <div className="center-muted">Loading messages…</div>
                ) : error ? (
                  <div className="center-error">
                    <div>{error}</div>
                    <button className="retry" onClick={() => window.location.reload()}>Retry</button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="center-muted">No messages yet — say hi 👋</div>
                ) : (
                  <div className="chat-stack">
                    {messages.map((msg, idx) => {
                      const mine = (msg.senderId || msg.sender?._id) === user?.id;
                      return (
                        <div key={msg._id || `${msg.createdAt}-${idx}`} className={`row ${mine ? "me" : "them"}`}>
                          <div className="bubble-wrap">
                            <div className={`chat-bubble ${mine ? "mine" : "theirs"}`} title={new Date(msg.createdAt).toLocaleString()}>
                              <p className={!mine ? "text-dark" : ""}>{msg.content}</p>

                              {msg.upload?.filename && (
                                <div 
                                  className={`file-preview ${mine ? "mine" : ""} ${msg.upload.data ? "downloadable" : ""}`}
                                  onClick={() => {
                                    if (msg.upload?.data) {
                                      const link = document.createElement('a');
                                      // Convert base64 to binary
                                      const binaryString = atob(msg.upload.data);
                                      const bytes = new Uint8Array(binaryString.length);
                                      for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                      }
                                      const blob = new Blob([bytes], { 
                                        type: msg.upload.contentType || 'application/octet-stream' 
                                      });
                                      const url = URL.createObjectURL(blob);
                                      link.href = url;
                                      link.download = msg.upload.filename || 'download';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);
                                    }
                                  }}
                                  style={{ cursor: msg.upload?.data ? 'pointer' : 'default' }}
                                >
                                  <div className="file-line">
                                    <span className="file-emoji">{fileIcon(msg.upload.filename)}</span>
                                    <span className={`file-name ${mine ? "white" : ""}`}>{msg.upload.filename}</span>
                                    {msg.upload.data && (
                                      <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="download-icon">
                                        <path d="M8 1v10m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <div className={`file-meta ${mine ? "white-50" : "muted"}`}>
                                    {msg.upload.data
                                      ? `${(msg.upload.data.length * 3 / 4 / 1024 / 1024).toFixed(2)} MB`
                                      : "Attachment"} • {msg.upload.contentType}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className={`stamp ${mine ? "right" : "left"}`}>{format(new Date(msg.createdAt), "p")}</div>
                          </div>
                      </div>
                      );
                    })}
                    </div>
                )}
                  <div ref={messagesEndRef} />
                </div>

              {/* Composer */}
              <div className="composer">
                  {selectedFile && (
                  <div className="file-preview attach">
                    <div className="file-line">
                      <span className="file-emoji">{fileIcon(selectedFile.name)}</span>
                      <span className="file-name">{selectedFile.name}</span>
                    </div>
                    <div className="file-meta muted">{formatFileSize(selectedFile.size)}</div>
                    <button
                      className="remove"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="Remove attachment"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="composer-row">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="attachment-button"
                    aria-label="Attach"
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                      <path d="M8 12.5l4-4a1.5 1.5 0 1 0-2-2l-4 4a2.5 2.5 0 1 0 3.5 3.5l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                      <input
                        type="text"
                        placeholder="Type your message..."
                    className="composer-input chat-input"
                        value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={5000}
                    aria-label="Message input"
                  />

                  <button className="send-btn action-button" onClick={handleSend} aria-label="Send">
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                      <path d="M2 10l16-8-8 8 8 8-16-8z" fill="currentColor"/>
                    </svg>
                  </button>
                    </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav"
                  />
                </div>
              </>
            ) : (
            <div className="chat-empty">
              <div className="center-muted">
                <div className="big-emoji">💬</div>
                <div className="empty-title">Select a conversation</div>
                <div className="muted">Choose a conversation from the sidebar to start messaging.</div>
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
};

export default Messages;
