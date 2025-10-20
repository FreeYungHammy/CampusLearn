import { io, Socket } from "socket.io-client";

// Types for socket events
type SignalData = { type: string; sdp?: string; candidate?: RTCIceCandidateInit };
type ChatMessage = any; // Import from your types
type SendMessagePayload = any; // Import from your types

// Global online status management
type UserOnlineStatus = { isOnline: boolean; lastSeen?: Date };
const globalOnlineStatus = new Map<string, UserOnlineStatus>();
const onlineStatusListeners = new Set<(status: Map<string, UserOnlineStatus>) => void>();

interface SocketManagerConfig {
  url: string;
  token: string;
}

interface NamespaceHandlers {
  chat: {
    onNewMessage?: (message: ChatMessage) => void;
    onMessageUpdated?: (data: { messageId: string; content: string; isEdited: boolean; editedAt: string }) => void;
    onUserStatusChange?: (userId: string, status: "online" | "offline", lastSeen: Date) => void;
    onChatCleared?: (payload: { chatId: string }) => void;
    onConnectionChange?: (connected: boolean) => void;
  };
  video: {
    onSignal?: (payload: { fromUserId?: string; data: SignalData }) => void;
    onPeerJoined?: (payload: { userId?: string }) => void;
    onPeerLeft?: (payload: { userId?: string }) => void;
    onConnectionChange?: (connected: boolean) => void;
    onIncomingCall?: (data: { callId: string; fromUserId: string; fromUserName: string }) => void;
    onCallCancelled?: (data: { callId: string }) => void;
  };
  global: {
    onPfpUpdated?: (data: { userId: string; timestamp: number }) => void;
    onConnectionChange?: (connected: boolean) => void;
    onNewPost?: (newPost: any) => void;
    onThreadDeleted?: (data: { threadId: string }) => void;
    onThreadUpdated?: (data: { updatedPost: any }) => void;
    onForumReplyCountUpdated?: (data: { threadId: string; replyCount: number }) => void;
    onVoteUpdated?: (data: { targetId: string; newScore: number; userVote?: number }) => void;
  };
}

class SocketManagerClass {
  private socket: Socket | null = null;
  private namespaces: {
    chat: Socket | null;
    video: Socket | null;
    global: Socket | null;
  } = {
    chat: null,
    video: null,
    global: null,
  };

  private config: SocketManagerConfig | null = null;
  private handlers: NamespaceHandlers = {
    chat: {},
    video: {},
    global: {},
  };

  private isConnected = false;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  // Singleton pattern
  private static instance: SocketManagerClass;
  public static getInstance(): SocketManagerClass {
    if (!SocketManagerClass.instance) {
      SocketManagerClass.instance = new SocketManagerClass();
    }
    return SocketManagerClass.instance;
  }

  /**
   * Initialize the socket manager with configuration
   */
  public initialize(config: SocketManagerConfig): void {
    console.log("[SocketManager] Initializing with config:", { 
      url: config.url, 
      hasToken: !!config.token 
    });

    // If already initialized with same config, don't reinitialize
    if (this.config && this.config.url === config.url && this.config.token === config.token && this.isConnected) {
      console.log("[SocketManager] Already initialized with same config, skipping");
      return;
    }

    this.config = config;
    this.connect();
  }

  /**
   * Connect to all namespaces
   */
  private connect(): void {
    if (!this.config) {
      console.warn("[SocketManager] Cannot connect: no configuration provided");
      return;
    }

    try {
      // Main socket connection
      this.socket = io(this.config.url, {
        auth: { token: this.config.token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelayMax: 5000,
      });

      // Setup main socket event handlers
      this.socket.on("connect", () => {
        console.log("[SocketManager] Main socket connected:", this.socket?.id);
        this.isConnected = true;
        this.notifyConnectionChange(true);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("[SocketManager] Main socket disconnected:", reason);
        this.isConnected = false;
        this.notifyConnectionChange(false);
        
        // Don't automatically reconnect if it's a manual disconnect or auth error
        if (reason === "io client disconnect" || reason === "io server disconnect") {
          console.log("[SocketManager] Manual disconnect, not reconnecting");
          return;
        }
        
        // For other disconnects, let the socket.io client handle reconnection
        console.log("[SocketManager] Will attempt automatic reconnection");
      });

      this.socket.on("connect_error", (error) => {
        console.error("[SocketManager] Main socket connection error:", error);
        this.isConnected = false;
        this.notifyConnectionChange(false);
        
        // Don't reconnect on auth errors
        if (error.message?.includes("Authentication") || error.message?.includes("401")) {
          console.error("[SocketManager] Authentication error, not reconnecting");
          return;
        }
      });

      // Initialize namespaces
      this.initializeNamespaces();

    } catch (error) {
      console.error("[SocketManager] Failed to connect:", error);
      this.isConnected = false;
      this.notifyConnectionChange(false);
    }
  }

  /**
   * Initialize all namespace connections
   */
  private initializeNamespaces(): void {
    if (!this.socket || !this.config) return;

    // Chat namespace - separate connection to /chat
    this.namespaces.chat = io(`${this.config.url}/chat`, {
      auth: { token: this.config.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
    this.setupChatHandlers();

    // Video namespace
    this.namespaces.video = io(`${this.config.url}/video`, {
      auth: { token: this.config.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
    this.setupVideoHandlers();

    // Global namespace (main socket handles this)
    this.namespaces.global = this.socket;
    this.setupGlobalHandlers();
  }

  /**
   * Setup chat namespace event handlers
   */
  private setupChatHandlers(): void {
    const chatSocket = this.namespaces.chat;
    if (!chatSocket) return;

    chatSocket.on("connect", () => {
      console.log("[SocketManager] Chat namespace connected");
      this.handlers.chat.onConnectionChange?.(true);
    });

    chatSocket.on("disconnect", () => {
      console.log("[SocketManager] Chat namespace disconnected");
      this.handlers.chat.onConnectionChange?.(false);
    });

    chatSocket.on("new_message", (message: ChatMessage) => {
      this.handlers.chat.onNewMessage?.(message);
    });

    chatSocket.on("message_updated", (data: { messageId: string; content: string; isEdited: boolean; editedAt: string }) => {
      this.handlers.chat.onMessageUpdated?.(data);
    });

    chatSocket.on("user_status_change", (data: { userId: string; status: "online" | "offline"; lastSeen: string | Date }) => {
      const lastSeenDate = new Date(data.lastSeen);
      
      // Update global online status
      globalOnlineStatus.set(data.userId, { isOnline: data.status === "online", lastSeen: lastSeenDate });
      
      // Notify all listeners
      onlineStatusListeners.forEach(listener => listener(globalOnlineStatus));
      
      // Call registered handler
      this.handlers.chat.onUserStatusChange?.(data.userId, data.status, lastSeenDate);
    });

    chatSocket.on("chat_cleared", (payload: { chatId: string }) => {
      this.handlers.chat.onChatCleared?.(payload);
    });
  }

  /**
   * Setup video namespace event handlers
   */
  private setupVideoHandlers(): void {
    const videoSocket = this.namespaces.video;
    if (!videoSocket) return;

    videoSocket.on("connect", () => {
      console.log("[SocketManager] Video namespace connected");
      this.handlers.video.onConnectionChange?.(true);
    });

    videoSocket.on("disconnect", () => {
      console.log("[SocketManager] Video namespace disconnected");
      this.handlers.video.onConnectionChange?.(false);
    });

    videoSocket.on("signal", (payload: { fromUserId?: string; data: SignalData }) => {
      console.log("[SocketManager] Video signal received:", payload.data?.type);
      this.handlers.video.onSignal?.(payload);
    });

    videoSocket.on("peer_joined", (payload: { userId?: string }) => {
      console.log("[SocketManager] Peer joined:", payload);
      this.handlers.video.onPeerJoined?.(payload);
    });

    videoSocket.on("peer_left", (payload: { userId?: string }) => {
      console.log("[SocketManager] Peer left:", payload);
      this.handlers.video.onPeerLeft?.(payload);
    });

    videoSocket.on("incoming_call", (data: { callId: string; fromUserId: string; fromUserName: string }) => {
      console.log("[SocketManager] Incoming call received:", data);
      console.log("[SocketManager] Current video handlers:", this.handlers.video);
      console.log("[SocketManager] onIncomingCall handler exists:", !!this.handlers.video.onIncomingCall);
      
      if (this.handlers.video.onIncomingCall) {
        console.log("[SocketManager] Calling onIncomingCall handler");
        this.handlers.video.onIncomingCall(data);
      } else {
        console.warn("[SocketManager] No onIncomingCall handler registered");
      }
    });

    videoSocket.on("call_cancelled", (data: { callId: string }) => {
      console.log("[SocketManager] Call cancelled:", data);
      this.handlers.video.onCallCancelled?.(data);
    });
  }

  /**
   * Setup global namespace event handlers
   */
  private setupGlobalHandlers(): void {
    const globalSocket = this.namespaces.global;
    if (!globalSocket) return;

    globalSocket.on("pfp_updated", (data: { userId: string; timestamp: number }) => {
      console.log("[SocketManager] Profile picture updated:", data);
      this.handlers.global.onPfpUpdated?.(data);
    });

    // Forum events (using main namespace)
    globalSocket.on("new_post", (newPost: any) => {
      console.log("[SocketManager] New forum post:", newPost);
      this.handlers.global.onNewPost?.(newPost);
    });

    globalSocket.on("thread_deleted", (data: { threadId: string }) => {
      console.log("[SocketManager] Forum thread deleted:", data);
      this.handlers.global.onThreadDeleted?.(data);
    });

    globalSocket.on("thread_updated", (data: { updatedPost: any }) => {
      console.log("[SocketManager] Forum thread updated:", data);
      this.handlers.global.onThreadUpdated?.(data);
    });

    globalSocket.on("forum_reply_count_updated", (data: { threadId: string; replyCount: number }) => {
      console.log("[SocketManager] Forum reply count updated:", data);
      this.handlers.global.onForumReplyCountUpdated?.(data);
    });

    globalSocket.on("vote_updated", (data: { targetId: string; newScore: number; userVote?: number }) => {
      console.log("[SocketManager] Vote updated:", data);
      this.handlers.global.onVoteUpdated?.(data);
    });
  }

  /**
   * Register event handlers for namespaces
   */
  public registerHandlers(handlers: Partial<NamespaceHandlers>): void {
    console.log("[SocketManager] Registering handlers:", handlers);
    
    if (handlers.chat) {
      this.handlers.chat = { ...this.handlers.chat, ...handlers.chat };
      console.log("[SocketManager] Chat handlers updated:", this.handlers.chat);
    }
    if (handlers.video) {
      this.handlers.video = { ...this.handlers.video, ...handlers.video };
      console.log("[SocketManager] Video handlers updated:", this.handlers.video);
    }
    if (handlers.global) {
      this.handlers.global = { ...this.handlers.global, ...handlers.global };
      console.log("[SocketManager] Global handlers updated:", this.handlers.global);
    }
  }

  /**
   * Unregister specific handlers
   */
  public unregisterHandlers(handlers: Partial<NamespaceHandlers>): void {
    if (handlers.chat) {
      Object.keys(handlers.chat).forEach(key => {
        delete this.handlers.chat[key as keyof typeof this.handlers.chat];
      });
    }
    if (handlers.video) {
      Object.keys(handlers.video).forEach(key => {
        delete this.handlers.video[key as keyof typeof this.handlers.video];
      });
    }
    if (handlers.global) {
      Object.keys(handlers.global).forEach(key => {
        delete this.handlers.global[key as keyof typeof this.handlers.global];
      });
    }
  }

  /**
   * Add connection state listener
   */
  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
  }

  /**
   * Remove connection state listener
   */
  public removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  /**
   * Notify all connection listeners
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  /**
   * Get socket instances
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  public getChatSocket(): Socket | null {
    return this.namespaces.chat;
  }

  public getVideoSocket(): Socket | null {
    return this.namespaces.video;
  }

  public getGlobalSocket(): Socket | null {
    return this.namespaces.global;
  }

  /**
   * Check if connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Check if already initialized
   */
  public isInitialized(): boolean {
    return this.config !== null && this.socket !== null;
  }

  /**
   * Disconnect all sockets
   */
  public disconnect(): void {
    console.log("[SocketManager] Disconnecting all sockets");
    
    if (this.namespaces.chat) {
      this.namespaces.chat.disconnect();
      this.namespaces.chat = null;
    }
    
    if (this.namespaces.video) {
      this.namespaces.video.disconnect();
      this.namespaces.video = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.namespaces.global = null;
    this.isConnected = false;
    this.notifyConnectionChange(false);
  }

  /**
   * Reconnect with new token
   */
  public reconnect(newToken: string): void {
    console.log("[SocketManager] Reconnecting with new token");
    this.disconnect();
    if (this.config) {
      this.config.token = newToken;
      this.connect();
    }
  }

  /**
   * Get current online status for all users
   */
  public getOnlineStatus(): Map<string, UserOnlineStatus> {
    return new Map(globalOnlineStatus);
  }

  /**
   * Subscribe to online status changes
   */
  public subscribeToOnlineStatus(listener: (status: Map<string, UserOnlineStatus>) => void): () => void {
    onlineStatusListeners.add(listener);
    // Immediately call with current status
    listener(globalOnlineStatus);
    
    return () => {
      onlineStatusListeners.delete(listener);
    };
  }
}

// Export singleton instance
export const SocketManager = SocketManagerClass.getInstance();

// Export types for use in hooks
export type { NamespaceHandlers, SignalData, UserOnlineStatus };
