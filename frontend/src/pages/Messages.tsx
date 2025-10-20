import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { SocketManager } from "../services/socketManager";
import { chatApi, type Conversation } from "@/services/chatApi";
import type { SendMessagePayload, ChatMessage } from "@/types/ChatMessage";
import { format, isSameDay } from "date-fns";
import ClearChatConfirmationModal from "@/components/ClearChatConfirmationModal";
import EnhancedBookingModal, {
  BookingData,
} from "@/components/EnhancedBookingModal";
import DateSeparator from "@/components/DateSeparator";
import BookingMessageCard from "@/components/chat/BookingMessageCard";
import VideoPlayer from "@/components/VideoPlayer";
import PageHeader from "@/components/PageHeader";
import "./Messages.css";

/* ---------- Default PFP (base64) ---------- */
const defaultPfp =
  "UklGRtwMAABXRUJQVlA4INAMAADwfgCdASpYAlgCPikUhkMhoQifeAwBQlpbuF3Wh6Lt78Z/7PtN/0P9S9H64kJH8O+5f8j+4+5bsB4AXszdRQAd3l8B5peIBwPtAb+ef2n0Bs7P1H00/r3/eD2kwWRXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VXVHT/Sq6o6f6VCSdpekO0tlR1kOzyIn7YNndUdP9KhH+RO//7+ce6NISuhSNHWppx4NfCiqZT3eJPk/bBs7q";

/* ---------- Helpers ---------- */
const getProfilePictureUrl = (userId: string, bust?: number) => {
  const baseUrl = (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
  const cacheBuster = bust ? `?t=${bust}` : "";
  const url = `${baseUrl}/api/users/${userId}/pfp${cacheBuster}`;
  return url;
};

const subjectBadgeColor = (subject: string) => {
  // Return consistent glass-like styling for all subjects
  return "glass-subject-badge";
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
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="PDF file"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#e53e3e"
            strokeWidth="1.5"
          />
          <path
            d="M7 13V7h2.5a1.5 1.5 0 1 1 0 3H7m4 3V7"
            stroke="#e53e3e"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "doc":
    case "docx":
      return (
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="Word document"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#2563eb"
            strokeWidth="1.5"
          />
          <path
            d="M7 7l1.2 6h.1l1.2-4.5L11.7 13h.1l1.2-6"
            stroke="#2563eb"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return (
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="Image file"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#10b981"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="8" r="1" fill="#10b981" />
          <path
            d="M5 15l4-5 3 4 3-4"
            stroke="#10b981"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "mp4":
    case "avi":
    case "mov":
      return (
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="Video file"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#f59e42"
            strokeWidth="1.5"
          />
          <polygon points="8,7 14,10 8,13" fill="#f59e42" />
        </svg>
      );
    case "mp3":
    case "wav":
      return (
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="Audio file"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#a21caf"
            strokeWidth="1.5"
          />
          <rect x="7" y="8" width="2" height="5" rx="1" fill="#a21caf" />
          <path
            d="M11 10.5a2 2 0 1 1 0 3"
            stroke="#a21caf"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg
          width="20"
          height="20"
          fill="none"
          aria-label="Attachment"
          viewBox="0 0 20 20"
        >
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            fill="#fff"
            stroke="#6b7280"
            strokeWidth="1.5"
          />
          <path
            d="M8 12.5l4-4a1.5 1.5 0 1 0-2-2l-4 4a2.5 2.5 0 1 0 3.5 3.5l4-4"
            stroke="#6b7280"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

// Image Modal Component
interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  filename,
  onClose,
  onDownload,
}) => {
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Ensure component is mounted before rendering
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      // Store original body styles
      const originalStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        width: document.body.style.width,
        height: document.body.style.height,
        top: document.body.style.top,
      };

      // Apply modal styles
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
      document.body.style.top = "0";

      return () => {
        // Restore original styles
        document.body.style.overflow = originalStyle.overflow;
        document.body.style.position = originalStyle.position;
        document.body.style.width = originalStyle.width;
        document.body.style.height = originalStyle.height;
        document.body.style.top = originalStyle.top;
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="image-modal-overlay" onClick={handleOverlayClick}>
      <div className="image-modal-content">
        <div className="image-modal-header">
          <span className="image-modal-filename">{filename}</span>
          <div className="image-modal-actions">
            <button
              className="image-modal-btn"
              onClick={(e) =>
                handleButtonClick(e, () => setIsZoomed(!isZoomed))
              }
              title={isZoomed ? "Fit to screen" : "Zoom in"}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    isZoomed
                      ? "M9 9V3H3v6h6zM21 21v-6h-6v6h6zM9 21v-6H3v6h6zM21 9V3h-6v6h6z"
                      : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                  }
                />
              </svg>
            </button>
            <button
              className="image-modal-btn"
              onClick={(e) => handleButtonClick(e, onDownload)}
              title="Download image"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                />
              </svg>
            </button>
            <button
              className="image-modal-btn"
              onClick={(e) => handleButtonClick(e, onClose)}
              title="Close"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="image-modal-body">
          <img
            src={imageUrl}
            alt={filename}
            className={`image-modal-image ${isZoomed ? "zoomed" : ""}`}
            onClick={handleImageClick}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );

  // Render modal outside the normal DOM hierarchy using portal
  return createPortal(modalContent, document.body);
};

// File Preview Component
interface FilePreviewProps {
  message: any;
  mine: boolean;
  token: string | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ message, mine, token }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [clickToLoadEnabled, setClickToLoadEnabled] = React.useState(() => {
    const savedPreference = localStorage.getItem("chat-image-click-to-load");
    return savedPreference === "true";
  });
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isModalTransitioning, setIsModalTransitioning] = React.useState(false);

  const filename =
    (message as any).uploadFilename || message.upload?.filename || "";
  const contentType =
    (message as any).uploadContentType || message.upload?.contentType || "";

  const isImage = () => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return (
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "") ||
      contentType.startsWith("image/")
    );
  };

  const isVideo = () => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return (
      ["mp4", "avi", "mov", "webm", "mkv", "flv", "wmv"].includes(ext || "") ||
      contentType.startsWith("video/")
    );
  };

  // Listen for settings changes
  React.useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      setClickToLoadEnabled(event.detail.clickToLoad);
    };

    window.addEventListener(
      "chat-image-settings-changed",
      handleSettingsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "chat-image-settings-changed",
        handleSettingsChange as EventListener,
      );
    };
  }, []);

  const loadImagePreview = async () => {
    if (!token || !isImage() || imageUrl || isLoading) return;

    setIsLoading(true);
    setError(false);

    try {
      const blob = await chatApi.downloadMessageFile(message._id || "", token);
      const url = window.URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (err) {
      console.error("Failed to load image preview:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load images if click-to-load is disabled
  React.useEffect(() => {
    if (
      isImage() &&
      !clickToLoadEnabled &&
      !imageUrl &&
      !isLoading &&
      !error &&
      token
    ) {
      loadImagePreview();
    }
  }, [clickToLoadEnabled, token, message._id]);

  const handleDownload = async () => {
    if (!token) return;

    try {
      const blob = await chatApi.downloadMessageFile(message._id || "", token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download file:", err);
      alert("Failed to download file.");
    }
  };

  const handleImageClick = () => {
    if (imageUrl && isImage() && !isModalTransitioning) {
      setIsModalTransitioning(true);
      setIsModalOpen(true);
      // Reset transition state after a short delay
      setTimeout(() => setIsModalTransitioning(false), 300);
    }
  };

  const handleModalClose = () => {
    if (!isModalTransitioning) {
      setIsModalTransitioning(true);
      setIsModalOpen(false);
      // Reset transition state after a short delay
      setTimeout(() => setIsModalTransitioning(false), 300);
    }
  };

  // Clean up object URL on unmount
  React.useEffect(() => {
    return () => {
      if (imageUrl) {
        window.URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  if (isImage()) {
    return (
      <div className={`file-preview image-preview ${mine ? "mine" : ""}`}>
        <div
          className="image-container"
          onClick={clickToLoadEnabled ? loadImagePreview : undefined}
          style={{
            cursor: isLoading
              ? "wait"
              : clickToLoadEnabled
                ? "pointer"
                : "default",
          }}
        >
          {isLoading ? (
            <div className="image-loading">
              <div className="spinner"></div>
              <span>Loading image...</span>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={filename}
              className="message-image clickable-image"
              onError={() => setError(true)}
              onClick={handleImageClick}
            />
          ) : error ? (
            <div className="image-error">
              <span>Failed to load image</span>
              <button onClick={loadImagePreview} className="retry-btn">
                Retry
              </button>
            </div>
          ) : clickToLoadEnabled ? (
            <div className="image-placeholder">
              <span className="file-icon">{fileIcon(filename)}</span>
              <span className="click-to-load">Click to load image</span>
            </div>
          ) : (
            <div className="image-loading">
              <div className="spinner"></div>
              <span>Loading image...</span>
            </div>
          )}
        </div>

        <div className="image-actions">
          <span className={`file-name ${mine ? "white" : ""}`}>{filename}</span>
          <button
            onClick={handleDownload}
            className="download-btn"
            title="Download image"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path
                d="M8 1v10m0 0l-3-3m3 3l3-3M2 13h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Image Modal */}
        {imageUrl && (
          <ImageModal
            isOpen={isModalOpen}
            imageUrl={imageUrl}
            filename={filename}
            onClose={handleModalClose}
            onDownload={handleDownload}
          />
        )}
      </div>
    );
  }

  // Video files - use VideoPlayer component with compression status
  if (isVideo()) {
    const videoUrl = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/api/chat/messages/${message._id}/file`;
    const fileId = (message as any).uploadFileId || message.upload?.fileId;

    return (
      <div className={`file-preview video-preview ${mine ? "mine" : ""}`}>
        <VideoPlayer
          src={videoUrl}
          title={filename}
          fileId={fileId}
          className="message-video-player"
        />
        <div className="video-actions">
          <span className={`file-name ${mine ? "white" : ""}`}>{filename}</span>
          <button
            onClick={handleDownload}
            className="download-btn"
            title="Download video"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path
                d="M8 1v10m0 0l-3-3m3 3l3-3M2 13h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Non-image/video files - use the original file preview
  return (
    <div
      className={`file-preview ${mine ? "mine" : ""} downloadable`}
      onClick={handleDownload}
      style={{ cursor: "pointer" }}
    >
      <div className="file-line">
        <span className="file-icon">{fileIcon(filename)}</span>
        <span className={`file-name ${mine ? "white" : ""}`}>{filename}</span>
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 16 16"
          className="download-icon"
        >
          <path
            d="M8 1v10m0 0l-3-3m3 3l3-3M2 13h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={`file-meta ${mine ? "white-50" : "muted"}`}>
        {contentType === "application/octet-stream"
          ? filename?.split(".").pop()?.toUpperCase() || "FILE"
          : contentType}
      </div>
    </div>
  );
};

const Messages: React.FC = () => {
  console.log("💬 Messages component rendering/re-rendering");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userOnlineStatus, setUserOnlineStatus] = useState<
    Map<string, { isOnline: boolean; lastSeen?: Date }>
  >(new Map());
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false); // New state for mobile chat view
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentRoomRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, token, pfpTimestamps } = useAuthStore();
  const {
    showBookingModal,
    bookingTarget,
    openBookingModal,
    closeBookingModal,
    createBooking,
  } = useBookingStore();
  const { getStatus, isOnline, getLastSeen } = useOnlineStatus();
  const location = useLocation();
  const selectedConversationUserId = (location.state as any)
    ?.selectedConversationUserId;

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    // On mobile, show chat panel and hide sidebar
    if (window.innerWidth < 850) {
      setShowMobileChat(true);
    }
  };

  const handleBackToConversations = () => {
    setShowMobileChat(false);
  };

  // Handle window resize to reset mobile state when screen becomes larger
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 850) {
        setShowMobileChat(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleBookingCreation = async (bookingData: BookingData) => {
    try {
      const newBooking = await createBooking(bookingData);

      // Send automatic message about the booking
      if (bookingTarget && user) {
        const isStudentBookingTutor =
          user.role === "student" && bookingTarget.role === "tutor";
        const recipientId = isStudentBookingTutor ? bookingTarget.id : user.id;

        const messageContent = `📅 New booking request: ${bookingData.subject} session scheduled for ${new Date(bookingData.date).toLocaleDateString()} at ${bookingData.time} (${bookingData.duration} minutes)${bookingData.notes ? `\n\nNotes: ${bookingData.notes}` : ""}`;

        try {
          // Create a chatId for the booking message
          const chatId = [user.id, recipientId].sort().join("-");
          await sendMessage({
            chatId: chatId,
            content: messageContent,
            senderId: user.id,
            receiverId: recipientId,
          });
        } catch (messageError) {
          console.warn("Failed to send booking message:", messageError);
          // Don't fail the booking creation if message sending fails
        }
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  const chatId = useMemo(() => {
    if (!selectedConversation || !user?.id) return null;
    return [user.id, selectedConversation.otherUser._id].sort().join("-");
  }, [selectedConversation, user?.id]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  /* -------- Socket handlers -------- */
  const handleNewMessage = useCallback(
    (newMessage: ChatMessage) => {
      console.log(
        "💬 [Messages] handleNewMessage called:",
        newMessage._id,
        "for chatId:",
        newMessage.chatId,
      );

      // Use refs to get current values to avoid stale closures
      const currentChatId = chatId;
      const currentUser = user;
      const currentSelectedConversation = selectedConversation;

      if (currentChatId && newMessage.chatId === currentChatId) {
        console.log("💬 [Messages] Adding message to current chat");
        setMessages((prev) => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some((msg) => msg._id === newMessage._id);
          if (exists) {
            console.log(
              "💬 [Messages] Message already exists, skipping duplicate",
            );
            return prev;
          }
          console.log("💬 [Messages] Adding new message to state");
          return [...prev, newMessage];
        });
      }

      setConversations((prev) => {
        const updated = prev.map((c) => {
          const cChatId = currentUser?.id
            ? [currentUser.id, c.otherUser._id].sort().join("-")
            : "";
          if (cChatId !== newMessage.chatId) return c;

          const isActive =
            currentSelectedConversation &&
            currentSelectedConversation._id === c._id;
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
          (a, b) =>
            new Date(b.lastMessage.createdAt).getTime() -
            new Date(a.lastMessage.createdAt).getTime(),
        );
      });
    },
    [chatId, selectedConversation, user?.id],
  );

  // Tick clock so time-based UI like edit window updates automatically
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000); // update every 30s
    return () => clearInterval(id);
  }, []);

  const handleUserStatusChange = useCallback(
    (userId: string, status: "online" | "offline", lastSeen: Date) => {
      console.log(
        `🟢 Status update received: User ${userId} is ${status} (last seen: ${lastSeen})`,
      );
      setUserOnlineStatus((prev) => {
        const m = new Map(prev);
        m.set(userId, { isOnline: status === "online", lastSeen });
        console.log(`📊 Updated status map:`, Array.from(m.entries()));
        return m;
      });
    },
    [],
  );
  // Online status is now managed globally by useOnlineStatus hook

  const handleMessageUpdated = useCallback(
    (data: {
      messageId: string;
      content: string;
      isEdited: boolean;
      editedAt: string;
    }) => {
      console.log("💬 [Messages] handleMessageUpdated called:", data.messageId);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                content: data.content,
                isEdited: data.isEdited,
                editedAt: data.editedAt,
              }
            : msg,
        ),
      );

      // Also update the sidebar snippet for the active conversation
      setConversations((prev) =>
        prev.map((c) =>
          selectedConversation && c._id === selectedConversation._id
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  content: data.content,
                },
              }
            : c,
        ),
      );
    },
    [selectedConversation?._id],
  );

  const handleChatCleared = useCallback(
    (payload: { chatId: string }) => {
      setConversations((prev) =>
        prev.filter((conv) => {
          const convChatId = user?.id
            ? [user.id, conv.otherUser._id].sort().join("-")
            : "";
          return convChatId !== payload.chatId;
        }),
      );

      if (chatId === payload.chatId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    },
    [chatId, user?.id],
  );

  const { sendMessage, isConnected, joinRoom, leaveRoom } = useChatSocket(
    handleNewMessage,
    handleMessageUpdated,
    handleUserStatusChange,
    handleChatCleared,
  );

  /* -------- Load conversation list -------- */
  useEffect(() => {
    if (!user?.id || !token) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const data = await chatApi.getConversations(user.id, token);
        const sorted = data.sort(
          (a, b) =>
            new Date(b.lastMessage.createdAt).getTime() -
            new Date(a.lastMessage.createdAt).getTime(),
        );
        if (!ac.signal.aborted) {
          setConversations(sorted);
          const isMobile = window.innerWidth < 850;
          if (!isMobile) {
            if (selectedConversationUserId) {
              const preSelected = sorted.find(
                (conv) => conv.otherUser._id === selectedConversationUserId,
              );
              if (preSelected) {
                setSelectedConversation(preSelected);
              } else if (sorted.length > 0) {
                setSelectedConversation((s) => s ?? sorted[0]);
              }
            } else if (sorted.length > 0) {
              setSelectedConversation((s) => s ?? sorted[0]);
            }
          } else {
            // On first mobile load, ensure the sidebar is shown first
            setSelectedConversation(null);
            setShowMobileChat(false);
          }
          setError(null);
        }
      } catch {
        if (!ac.signal.aborted) setError("Failed to load conversations");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [user?.id, token, selectedConversationUserId]);

  // Cleanup effect to prevent state interference with other pages
  useEffect(() => {
    return () => {
      // Clear all Messages state when component unmounts to prevent interference
      // BUT keep userOnlineStatus to maintain online status across page navigation
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setSearchQuery("");
      setInput("");
      setLoading(true);
      setThreadLoading(false);
      setError(null);
      setSelectedFile(null);
      // Don't clear userOnlineStatus - keep it for persistence across navigation
      setIsClearModalOpen(false);
      setIsClearing(false);
      setIsDropdownOpen(false);

      // Clear current room reference
      if (currentRoomRef.current) {
        currentRoomRef.current = null;
      }
    };
  }, []);

  /* -------- Load messages for selected conversation -------- */
  useEffect(() => {
    if (!chatId || !token) {
      setMessages([]); // Clear messages if no chat is selected
      return;
    }

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

    loadThread();
  }, [chatId, token]);

  /* -------- Switch Socket Room -------- */
  useEffect(() => {
    if (!chatId) return;

    if (chatId !== currentRoomRef.current) {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
      }
      joinRoom(chatId);
      currentRoomRef.current = chatId;
    }

    // This cleanup function is important for when the component unmounts
    return () => {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [chatId, joinRoom, leaveRoom]);

  /* -------- Auto-scroll on new messages -------- */
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else {
      // Fallback if ref not available yet
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
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
          prev.map((c) =>
            c._id === selectedConversation._id ? { ...c, unreadCount: 0 } : c,
          ),
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
          content: trimmed || `📎 ${selectedFile.name}`,
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

    const payload: SendMessagePayload = {
      chatId,
      content: trimmed,
      senderId: user.id,
      receiverId: selectedConversation.otherUser._id,
    };
    sendMessage(payload);
    finish();
  }, [
    chatId,
    input,
    selectedConversation,
    selectedFile,
    sendMessage,
    user?.id,
  ]);

  const handleClearConversation = async () => {
    if (!selectedConversation || !user?.id || !token) return;

    setIsClearing(true);
    try {
      await chatApi.deleteConversation(
        user.id,
        selectedConversation.otherUser._id,
        token,
      );
      // Remove the conversation from the sidebar
      setConversations((prev) =>
        prev.filter((conv) => conv._id !== selectedConversation._id),
      );
      setMessages([]); // Clear messages from view
      setSelectedConversation(null); // Deselect the conversation
      setIsClearModalOpen(false);
    } catch (error) {
      console.error("Failed to clear conversation", error);
      // Optionally, show an error to the user
    } finally {
      setIsClearing(false);
    }
  };

  const handleBookingAction = useCallback(
    async (bookingId: string, action: "confirm" | "cancel") => {
      try {
        // Import booking API
        const { updateBookingStatus } = await import("@/services/bookingApi");
        const status = action === "confirm" ? "confirmed" : "cancelled";
        await updateBookingStatus(bookingId, status);
      } catch (error) {
        console.error(`Failed to ${action} booking:`, error);
      }
    },
    [],
  );

  /* IME-safe Enter to send */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // @ts-ignore
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------- Message editing handlers -------- */
  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !token || !editingContent.trim()) return;

    try {
      // Call backend API to update message
      const updatedMessage = await chatApi.updateMessage(
        editingMessageId,
        editingContent,
        token,
      );

      // Update local state with the response from the server
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === editingMessageId
            ? {
                ...msg,
                content: updatedMessage.content,
                isEdited: updatedMessage.isEdited,
                editedAt: updatedMessage.editedAt,
              }
            : msg,
        ),
      );

      // Reflect the edit in the left-hand conversation list immediately
      if (selectedConversation) {
        setConversations((prev) =>
          prev.map((c) =>
            c._id === selectedConversation._id
              ? {
                  ...c,
                  lastMessage: {
                    ...c.lastMessage,
                    content: updatedMessage.content,
                  },
                }
              : c,
          ),
        );
      }

      handleCancelEdit();
    } catch (error) {
      console.error("Failed to edit message:", error);
      // Handle error (show toast notification, etc.)
    }
  };

  /* -------- Derived lists -------- */
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const full =
        `${c.otherUser.profile?.name || ""} ${c.otherUser.profile?.surname || ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [conversations, searchQuery]);

  const handleStartVideoCall = useCallback(async () => {
    console.log("[video-call] handleStartVideoCall called!");
    console.log("[video-call] selectedConversation:", !!selectedConversation);
    console.log("[video-call] user:", !!user);

    if (!selectedConversation || !user?.id) {
      console.log(
        "[video-call] Missing selectedConversation or user, returning",
      );
      return;
    }

    const otherId = selectedConversation.otherUser._id;
    const callId = [user.id, otherId].sort().join(":");

    // Send call notification to the other user first
    try {
      console.log("[video-call] Initiating call notification", {
        callId,
        targetUserId: otherId,
      });

      // Use centralized SocketManager instead of temporary socket
      const { SocketManager } = await import("../services/socketManager");

      // Initialize socket manager if not already done
      if (!SocketManager.isSocketConnected()) {
        const SOCKET_BASE_URL = (import.meta.env.VITE_WS_URL as string).replace(
          /\/$/,
          "",
        );
        const token = useAuthStore.getState().token;
        if (token) {
          SocketManager.initialize({
            url: SOCKET_BASE_URL,
            token: token,
          });
        }
      }

      const videoSocket = SocketManager.getVideoSocket();
      if (videoSocket) {
        console.log(
          "[video-call] Sending initiate_call via centralized socket",
        );
        videoSocket.emit("initiate_call", { callId, targetUserId: otherId });
        console.log("[video-call] Call notification sent successfully");
      } else {
        console.error("[video-call] Video socket not available");
      }
    } catch (error) {
      console.error("Failed to send call notification:", error);
    }

    // Open the call popup
    console.log("[video-call] Call ID:", callId, "Target User:", otherId);

    // Open the call popup with initiator information
    import("@/utils/openCallPopup").then(({ openCallPopup }) => {
      openCallPopup(callId, user.id); // Pass the initiator ID
    });
  }, [selectedConversation, user?.id]);

  /* -------- Messages with date separators, profile picture grouping, and timestamp grouping -------- */
  const messagesWithSeparators = useMemo(() => {
    if (messages.length === 0) return [];

    const result: (ChatMessage | { type: "date-separator"; date: Date })[] = [];

    // First pass: find the last message from each sender
    const lastMessageFromSender = new Map<string, number>();
    for (let i = 0; i < messages.length; i++) {
      const senderId = messages[i].senderId || messages[i].sender?._id;
      if (senderId) {
        lastMessageFromSender.set(senderId, i);
      }
    }

    // Group messages by timestamp AND sender (same minute + same sender)
    const timestampGroups = new Map<string, number[]>();
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const timestamp = new Date(message.createdAt);
      const senderId = message.senderId || message.sender?._id;
      const timestampKey = `${format(timestamp, "yyyy-MM-dd HH:mm")}-${senderId}`; // Group by minute AND sender

      if (!timestampGroups.has(timestampKey)) {
        timestampGroups.set(timestampKey, []);
      }
      timestampGroups.get(timestampKey)!.push(i);
    }

    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      const nextMessage = messages[i + 1];
      const currentDate = new Date(currentMessage.createdAt);

      // Add date separator before the first message
      if (i === 0) {
        result.push({ type: "date-separator", date: currentDate });
      } else {
        // Check if the date has changed from the previous message
        const previousMessage = messages[i - 1];
        const previousDate = new Date(previousMessage.createdAt);

        if (!isSameDay(currentDate, previousDate)) {
          result.push({ type: "date-separator", date: currentDate });
        }
      }

      // Add the actual message with grouping info
      const messageWithGrouping = {
        ...currentMessage,
        showProfilePicture: false, // Default to false
        showTimestamp: false, // Default to false
      };

      // Show profile picture only for the first message in each timestamp group
      const currentSenderId =
        currentMessage.senderId || currentMessage.sender?._id;
      const timestamp = format(currentDate, "yyyy-MM-dd HH:mm");
      const timestampKey = `${timestamp}-${currentSenderId}`;
      const timestampGroup = timestampGroups.get(timestampKey);

      // Show profile picture only if this is the first message in its timestamp group
      messageWithGrouping.showProfilePicture = Boolean(
        timestampGroup && timestampGroup[0] === i,
      );

      // Show timestamp only for the last message in each timestamp group (both sides)
      if (timestampGroup && timestampGroup[timestampGroup.length - 1] === i) {
        messageWithGrouping.showTimestamp = true;
      }

      result.push(messageWithGrouping);
    }

    return result;
  }, [messages]);

  if (loading) return <div>Loading...</div>;

  return (
    <main className="messages-root">
      <PageHeader
        title="Messages"
        subtitle="Connect and communicate with your tutors and students"
        icon="fas fa-comments"
      />

      <div className="messages-shell">
        {/* Sidebar */}
        <aside className={`sidebar ${showMobileChat ? "mobile-hidden" : ""}`}>
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
              const status = getStatus(conv.otherUser._id);
              const pfpBust = pfpTimestamps?.[conv.otherUser._id];

              return (
                <div
                  key={conv._id}
                  className={`message-thread${isActive ? " active" : ""}`}
                  onClick={() => handleConversationSelect(conv)}
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
                            `data:image/png;base64,${defaultPfp}`;
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
                          {conv.lastMessage?.createdAt &&
                            format(new Date(conv.lastMessage.createdAt), "p")}
                        </span>
                      </div>
                      <p className="snippet">
                        {conv.lastMessage?.content || "No messages yet"}
                      </p>

                      <div className="thread-meta">
                        {conv.unreadCount > 0 && (
                          <span className="unread">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && !loading && (
              <div className="empty-tab">
                <div className="empty-sidebar-centered">
                  <div className="empty-icon">💬</div>
                  <div className="empty-title">No conversations found</div>
                  <div className="empty-desc">
                    Ensure students have subscribed to you as a tutor.
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section
          className={`chat-panel ${showMobileChat ? "mobile-visible" : ""}`}
        >
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="chat-header">
                {/* Mobile back button */}
                <button
                  className="mobile-back-btn"
                  onClick={handleBackToConversations}
                  aria-label="Back to conversations"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path
                      d="M12.5 15L7.5 10L12.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="header-left">
                  <div className="pfp-wrap small">
                    <img
                      src={getProfilePictureUrl(
                        selectedConversation.otherUser._id,
                        pfpTimestamps?.[selectedConversation.otherUser._id],
                      )}
                      alt={`${selectedConversation.otherUser.profile?.name || ""} ${selectedConversation.otherUser.profile?.surname || ""}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          `data:image/png;base64,${defaultPfp}`;
                      }}
                    />
                    {isOnline(selectedConversation.otherUser._id) && (
                      <span className="status online small" />
                    )}
                  </div>
                  <div>
                    <div className="header-name">
                      {`${selectedConversation.otherUser.profile?.name || "Unknown"} ${selectedConversation.otherUser.profile?.surname || "User"}`}
                    </div>
                    <div className="header-sub">
                      {(() => {
                        const status = getStatus(
                          selectedConversation.otherUser._id,
                        );
                        if (status?.isOnline)
                          return <span className="online-text">Online</span>;
                        if (status?.lastSeen)
                          return (
                            <span className="muted">
                              Last seen {format(status.lastSeen, "p")}
                            </span>
                          );
                        return <span className="muted">Offline</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="header-actions">
                  <button
                    className="action-button"
                    aria-label="Video"
                    onClick={() => {
                      console.log("[video-call] Video call button clicked!");
                      handleStartVideoCall();
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path
                        d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    className="action-button"
                    aria-label="Clear chat"
                    title="Clear messages"
                    onClick={() => setIsClearModalOpen(true)}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>

              {/* Thread */}
              <div className="chat-scroll" ref={chatScrollRef}>
                {threadLoading && messages.length === 0 ? (
                  <div className="center-muted">Loading messages…</div>
                ) : error ? (
                  <div className="center-error">
                    <div>{error}</div>
                    <button
                      className="retry"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="center-muted">
                    No messages yet — say hi 👋
                  </div>
                ) : (
                  <div className="chat-stack">
                    {messagesWithSeparators.map((item, idx) => {
                      // Handle date separator
                      if ("type" in item && item.type === "date-separator") {
                        return (
                          <DateSeparator
                            key={`date-${item.date.toISOString()}-${idx}`}
                            date={item.date}
                          />
                        );
                      }

                      // Handle regular message
                      const msg = item as ChatMessage & {
                        showProfilePicture?: boolean;
                      };
                      const mine =
                        (msg.senderId || msg.sender?._id) === user?.id;

                      // Check if this is a "Conversation started" system message
                      const isSystemMessage = msg.content
                        ?.toLowerCase()
                        .includes("conversation started");

                      // Check if this is a booking message
                      const isBookingMessage =
                        msg.messageType &&
                        msg.messageType.startsWith("booking_");

                      // Render system message differently
                      if (isSystemMessage) {
                        return (
                          <div
                            key={msg._id || `${msg.createdAt}-${idx}`}
                            className="system-message"
                          >
                            <div className="system-message-content">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      // Render booking message differently
                      if (isBookingMessage) {
                        return (
                          <BookingMessageCard
                            key={msg._id || `${msg.createdAt}-${idx}`}
                            message={msg}
                            isOwnMessage={mine}
                            onBookingAction={handleBookingAction}
                          />
                        );
                      }

                      return (
                        <div
                          key={msg._id || `${msg.createdAt}-${idx}`}
                          className={`row ${mine ? "me" : "them"}`}
                        >
                          {msg.showProfilePicture && (
                            <div className="pfp-wrap xs">
                              <img
                                src={
                                  msg.senderId
                                    ? getProfilePictureUrl(
                                        msg.senderId,
                                        pfpTimestamps?.[msg.senderId],
                                      )
                                    : `data:image/png;base64,${defaultPfp}`
                                }
                                alt={msg.sender?.name || "User"}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    `data:image/png;base64,${defaultPfp}`;
                                }}
                              />
                            </div>
                          )}

                          {!msg.showProfilePicture && (
                            <div className="pfp-wrap xs empty"></div>
                          )}

                          <div className="bubble-wrap">
                            {editingMessageId === msg._id ? (
                              <div className="message-edit-container">
                                <textarea
                                  className="message-edit-textarea"
                                  value={editingContent}
                                  onChange={(e) =>
                                    setEditingContent(e.target.value)
                                  }
                                  rows={3}
                                  autoFocus
                                />
                                <div className="message-edit-actions">
                                  <button
                                    className="edit-cancel-btn"
                                    onClick={handleCancelEdit}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="edit-save-btn"
                                    onClick={handleSaveEdit}
                                    disabled={!editingContent.trim()}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`chat-bubble ${mine ? "mine" : "theirs"} ${mine ? "editable" : ""}`}
                                title={new Date(msg.createdAt).toLocaleString()}
                              >
                                {(() => {
                                  const created = new Date(
                                    msg.createdAt,
                                  ).getTime();
                                  const withinWindow =
                                    nowTs - created < 10 * 60 * 1000; // 10 minutes
                                  return mine && withinWindow ? (
                                    <button
                                      className="message-edit-btn"
                                      onClick={() =>
                                        handleEditMessage(
                                          msg._id || "",
                                          msg.content,
                                        )
                                      }
                                      title="Edit message"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                  ) : null;
                                })()}
                                <p className={!mine ? "text-dark" : ""}>
                                  {msg.content}
                                  {(msg as any).isEdited && (
                                    <span className="edited-indicator">
                                      {" "}
                                      (edited)
                                    </span>
                                  )}
                                </p>

                                {((msg as any).uploadFilename ||
                                  msg.upload?.filename) && (
                                  <FilePreview
                                    message={msg}
                                    mine={mine}
                                    token={token}
                                  />
                                )}
                              </div>
                            )}
                            {(msg as any).showTimestamp && (
                              <div
                                className={`stamp ${mine ? "right" : "left"}`}
                              >
                                {format(new Date(msg.createdAt), "p")}
                              </div>
                            )}
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
                      <span className="file-emoji">
                        {fileIcon(selectedFile.name)}
                      </span>
                      <span className="file-name">{selectedFile.name}</span>
                    </div>
                    <div className="file-meta muted">
                      {formatFileSize(selectedFile.size)}
                    </div>
                    <button
                      className="remove"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
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
                      <path
                        d="M8 12.5l4-4a1.5 1.5 0 1 0-2-2l-4 4a2.5 2.5 0 1 0 3.5 3.5l4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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

                  <button
                    className="send-btn action-button"
                    onClick={handleSend}
                    aria-label="Send"
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                      <path d="M2 10l16-8-8 8 8 8-16-8z" fill="currentColor" />
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
                />
              </div>
            </>
          ) : (
            <div className="chat-empty">
              <div className="center-muted">
                <div className="big-emoji">💬</div>
                <div className="empty-title">Select a conversation</div>
                <div className="muted">
                  Choose a conversation from the sidebar to start messaging.
                </div>
              </div>
            </div>
          )}

          {selectedConversation && (
            <ClearChatConfirmationModal
              show={isClearModalOpen}
              onClose={() => setIsClearModalOpen(false)}
              onConfirm={handleClearConversation}
              isSubmitting={isClearing}
              userName={`${selectedConversation.otherUser.profile?.name || "Unknown"} ${
                selectedConversation.otherUser.profile?.surname || "User"
              }`}
            />
          )}

          {/* Booking Modal */}
          {showBookingModal && bookingTarget && user && (
            <EnhancedBookingModal
              isOpen={showBookingModal}
              onClose={closeBookingModal}
              onConfirm={handleBookingCreation}
              targetUser={bookingTarget}
              currentUser={user}
            />
          )}
        </section>
      </div>
    </main>
  );
};

export default Messages;
