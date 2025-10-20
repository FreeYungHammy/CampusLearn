import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { ChatService } from "../modules/chat/chat.service";
import { verifyJwt } from "../auth/jwt";
import { CacheService } from "../services/cache.service";
import { env } from "./env";

type SendMessagePayload = {
  chatId: string;
  content: string;
  senderId: string;
  receiverId: string;
  upload?: {
    data: string;
    contentType: string;
    filename: string;
  };
};

let io: Server;

// Track connected users
const connectedUsers = new Map<
  string,
  { 
    chatSocketId?: string; 
    videoSocketId?: string; 
    userId: string; 
    lastSeen: Date 
  }
>();

// Signal buffer for rooms with no other participants
const signalBuffer = new Map<string, Array<{ fromUserId: string; data: any; timestamp: Date }>>();

// Track active calls to prevent conflicts
const activeCalls = new Set<string>();

// Debug helper - remove after testing
function logConnectedUsers(context: string) {
  console.log(`[${context}] Connected users:`, 
    Array.from(connectedUsers.entries()).map(([id, info]) => ({
      userId: id,
      chatSocket: info.chatSocketId?.slice(0, 8),
      videoSocket: info.videoSocketId?.slice(0, 8)
    }))
  );
}

export function createSocketServer(httpServer: HttpServer) {
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io", // client uses default path too; keep in sync if you change it
    maxHttpBufferSize: 10e6, // 10 MB (reduced from 15MB)
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    cors: {
      origin: allowed.length ? allowed : env.corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.engine.on("connection_error", (err) => {
    console.error("engine.io connection_error:", {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // Keep default-namespace demo handlers if you actually use them elsewhere.
  io.on("connection", (socket) => {
    // Removed verbose connection logging
    socket.on("messages:get", ({ peerId }) => {
      io.to(socket.id).emit("messages:history", []);
    });
    socket.on("join_thread", (threadId: string) => {
      socket.join(threadId);
    });
    socket.on("message:send", (msg: unknown) => {
      io.emit("message:receive", msg);
    });
    
    // Handle heartbeat ping
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  const chat = io.of("/chat");

  // Add authentication middleware to chat namespace
  chat.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Check if token is blacklisted (use debug logging to reduce noise)
      const isBlacklisted = await CacheService.get(`jwt:blacklist:${token}`, 'debug');
      if (isBlacklisted) {
        return next(new Error("Authentication error: Token has been revoked"));
      }

      const payload = verifyJwt(token);
      if (!payload) {
        return next(
          new Error("Authentication error: Invalid or expired token"),
        );
      }

      // Attach user info to socket
      socket.data.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  chat.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    // Removed verbose chat connection logging

    // Track connected user
    if (userId) {
      const existing = connectedUsers.get(userId) || { userId, lastSeen: new Date() };
      connectedUsers.set(userId, {
        ...existing,
        chatSocketId: socket.id,
        lastSeen: new Date(),
      });

      // Emit user online status to all connected clients
      chat.emit("user_status_change", {
        userId: userId,
        status: "online",
        lastSeen: new Date(),
      });
      
      logConnectedUsers("chat namespace connection");
    }

    socket.on("join_room", async (chatId: string) => {
      socket.join(chatId);
      // Removed verbose room join logging
      
      // Emit current user's online status to all users in this room
      if (userId) {
        const userStatus = connectedUsers.get(userId);
        if (userStatus) {
          socket.to(chatId).emit("user_status_change", {
            userId: userId,
            status: "online",
            lastSeen: userStatus.lastSeen,
          });
        }
      }
      
      // Send current online status of all users in this room to the joining user
      const roomSockets = await chat.in(chatId).fetchSockets();
      const roomUserIds = roomSockets
        .map(s => s.data.user?.id)
        .filter(Boolean);
      
      // Removed verbose room status logging
      
      // Send status of all users currently in this room
      for (const roomUserId of roomUserIds) {
        if (roomUserId !== userId) { // Don't send own status
          const status = connectedUsers.get(roomUserId);
          if (status) {
            // Removed verbose status sending logging
            socket.emit("user_status_change", {
              userId: roomUserId,
              status: "online",
              lastSeen: status.lastSeen,
            });
          } else {
            console.log(`No status found for user ${roomUserId}`);
          }
        }
      }
    });

    socket.on("leave_room", (chatId: string) => {
      socket.leave(chatId);
      // Removed verbose room leave logging
    });

    socket.on("send_message", async (data: SendMessagePayload, ack) => {
      try {
        // Validate that the senderId matches the authenticated user
        if (data.senderId !== socket.data.user?.id) {
          console.error("Unauthorized message send attempt:", {
            socketUserId: socket.data.user?.id,
            messageSenderId: data.senderId,
          });
          if (ack) ack({ ok: false, error: "Unauthorized" });
          return;
        }

        // Save message to database and emit to room
        const savedMessage = await ChatService.send(data);

        // Send acknowledgment back to sender
        if (ack) ack({ ok: true, message: savedMessage });
      } catch (e) {
        console.error("send_message failed:", e);
        if (ack)
          ack({
            ok: false,
            error: e instanceof Error ? e.message : "Send failed",
          });
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.user?.id;
      // Removed verbose disconnect logging

      // Remove user from connected users and emit offline status
      if (userId) {
        const userInfo = connectedUsers.get(userId);
        if (userInfo) {
          // Remove chat socket but keep user if they're still on video
          userInfo.chatSocketId = undefined;
          userInfo.lastSeen = new Date();
          
          // Only delete entirely if no sockets remain
          if (!userInfo.videoSocketId) {
            connectedUsers.delete(userId);
            
            // Emit offline status only when fully disconnected
            chat.emit("user_status_change", {
              userId: userId,
              status: "offline",
              lastSeen: new Date(),
            });
          } else {
            // Still connected via video, update lastSeen
            connectedUsers.set(userId, userInfo);
          }
        }
        
        logConnectedUsers("chat namespace disconnection");
      }
    });
  });

  /* ---------- VIDEO NAMESPACE (WebRTC signaling) ---------- */
  const video = io.of("/video");
  // Lazy imports to avoid circular deps at module load time
  // Presence + rate limiting helpers
  let presence: typeof import("../realtime/presence.service");
  let rateLimit: typeof import("../realtime/rateLimit.service");
  (async () => {
    presence = await import("../realtime/presence.service");
    rateLimit = await import("../realtime/rateLimit.service");
  })();

  // Reuse JWT auth for /video namespace
  video.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error: No token provided'));

      const isBlacklisted = await CacheService.get(`jwt:blacklist:${token}`, 'debug');
      if (isBlacklisted) return next(new Error('Authentication error: Token has been revoked'));

      const payload = verifyJwt(token);
      if (!payload) return next(new Error('Authentication error: Invalid or expired token'));

      socket.data.user = { id: payload.id, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  video.on("connection", (socket) => {
    const userId = socket.data.user?.id as string | undefined;
    if (userId) {
      const existing = connectedUsers.get(userId) || { userId, lastSeen: new Date() };
      connectedUsers.set(userId, {
        ...existing,
        videoSocketId: socket.id,
        lastSeen: new Date(),
      });
      
      // Emit user online status to all connected clients in chat namespace
      chat.emit("user_status_change", {
        userId: userId,
        status: "online",
        lastSeen: new Date(),
      });
      
      logConnectedUsers("video namespace connection");
    }

    // join_call: client joins a signaling room for a given callId
    // payload: { callId: string }
    socket.on("join_call", async ({ callId, role }: { callId: string; role?: "tutor"|"student"|"guest" }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log("[/video] join_call", { socket: socket.id, userId, callId, role });
      }
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:join")) return;
      
      socket.join(callId);
      
      // Check if there are already participants in the call
      const roomSockets = await video.in(callId).fetchSockets();
      const otherParticipants = roomSockets.filter(s => s.id !== socket.id);
      
      if (otherParticipants.length > 0) {
        console.log(`[video] User ${userId} joining existing call ${callId} with ${otherParticipants.length} other participants`);
        
        // Flush buffered signals to the joining user
        if (signalBuffer.has(callId)) {
          const bufferedSignals = signalBuffer.get(callId)!;
          console.log(`[video] 📤 Flushing ${bufferedSignals.length} buffered signals to joining user ${userId}`);
          
          for (const bufferedSignal of bufferedSignals) {
            socket.emit("signal", { fromUserId: bufferedSignal.fromUserId, data: bufferedSignal.data });
          }
          
          // Clear the buffer for this call
          signalBuffer.delete(callId);
        }
        
        // Notify existing participants that someone joined
        socket.to(callId).emit("peer_joined", { userId });
        
        // Notify the joining user about existing participants
        for (const participant of otherParticipants) {
          if (participant.data.user?.id) {
            socket.emit("peer_joined", { userId: participant.data.user.id });
          }
        }
      } else {
        console.log(`[video] User ${userId} starting new call ${callId}`);
      }
      
      if (userId && presence) {
        await presence.markSocketOnline(userId, socket.id);
        await presence.addMemberToRoom(callId, userId);
      }
      
      // Persist lifecycle (best-effort, non-blocking on errors)
      try {
        const { CallService } = await import("../realtime/call.service");
        await CallService.startCall(callId, userId || "unknown");
        if (userId) await CallService.joinCall(callId, userId, role || "guest");
      } catch {}
    });

    // initiate_call: start a call and notify the other participant
    socket.on("initiate_call", async ({ callId, targetUserId, fromUserName }: { callId: string; targetUserId: string; fromUserName?: string }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log("[/video] initiate_call", { socket: socket.id, userId, callId, targetUserId });
      }
      if (!callId || !targetUserId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:initiate")) return;
      
      // Validate that the caller is the initiator (based on callId structure)
      const callIdParts = callId.split(":");
      if (callIdParts.length !== 2) {
        console.log(`[video] Invalid callId format: ${callId}`);
        return;
      }
      
      // Check if the caller is one of the participants in the call
      if (!userId || !callIdParts.includes(userId)) {
        console.log(`[video] User ${userId} is not a participant in call ${callId}, ignoring initiate_call`);
        return;
      }
      
      // Check if call is already active
      if (activeCalls.has(callId)) {
        console.log(`[video] Call ${callId} is already active, ignoring initiate_call`);
        return;
      }
      
      // Mark call as active
      activeCalls.add(callId);
      console.log(`[video] Call ${callId} marked as active`);
      
      // Find the target user's socket
      const targetUser = connectedUsers.get(targetUserId);
      if (targetUser) {
        // Use provided fromUserName or get from database
        let callerName = fromUserName || "User";
        if (!fromUserName) {
          try {
            const { UserService } = await import("../modules/users/user.service");
            const { UserRepo } = await import("../modules/users/user.repo");
            
            // First get the user to determine their role
            const user = await UserRepo.findById(userId || "");
            if (user) {
              // Get the profile based on role
              const profile = await UserService.getProfileByRole(user.id, user.role);
              if (profile && profile.name) {
                callerName = `${profile.name || ""} ${profile.surname || ""}`.trim() || "User";
              }
            }
          } catch (error) {
            console.error("Failed to get caller name:", error);
          }
        }
        
        // Send notification to target user
        console.log(`[video] Attempting to send notification to user ${targetUserId}`);
        console.log(`[video] Target user socket info:`, { 
          videoSocketId: targetUser.videoSocketId, 
          chatSocketId: targetUser.chatSocketId 
        });
        
        // Send to video namespace socket specifically
        if (targetUser.videoSocketId) {
          // Verify the socket is still connected before sending
          const videoSocket = video.sockets.get(targetUser.videoSocketId);
          if (videoSocket && videoSocket.connected) {
            video.to(targetUser.videoSocketId).emit("incoming_call", {
              callId,
              fromUserId: userId,
              fromUserName: callerName,
            });
            console.log(`[video] ✅ Sent incoming_call to ${targetUserId} on socket ${targetUser.videoSocketId}`);
          } else {
            console.warn(`[video] ⚠️ Socket ${targetUser.videoSocketId} is not connected, trying chat namespace fallback`);
            // Fallback to chat namespace if video socket is disconnected
            if (targetUser.chatSocketId) {
              chat.to(targetUser.chatSocketId).emit("incoming_call", {
                callId,
                fromUserId: userId,
                fromUserName: callerName,
              });
              console.log(`[video] ✅ Sent incoming_call to ${targetUserId} via chat namespace fallback`);
            }
          }
        } else {
          console.warn(`[video] ❌ Cannot send incoming_call - user ${targetUserId} not connected to video namespace`);
        }
      }
    });

    // decline_call: handle call decline
    socket.on("decline_call", ({ callId, fromUserId }: { callId: string; fromUserId: string }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log("[/video] decline_call", { socket: socket.id, userId, callId, fromUserId });
      }
      if (!callId || !fromUserId) return;
      
      // Notify the caller that the call was declined
      const caller = connectedUsers.get(fromUserId);
      if (caller) {
        if (caller.videoSocketId) {
          video.to(caller.videoSocketId).emit("call_cancelled", { callId });
        } else {
          console.warn(`[video] Cannot send call_cancelled - user ${fromUserId} not connected to video namespace`);
        }
      }
    });

    // signal: relay offer/answer/ice to peers in room
    // payload: { callId: string, data: { type: 'offer'|'answer'|'candidate', sdp?, candidate? } }
    socket.on("signal", ({ callId, data }: { callId: string; data: unknown }) => {
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:signal")) return;
      
      const signalType = (data as any)?.type;
      console.log(`[video] 📡 Signal received: ${signalType} from ${userId} in call ${callId}`);
      console.log(`[video] Signal data:`, data);
      
      // Check if there are other participants in the room
      video.in(callId).fetchSockets().then(roomSockets => {
        const otherSockets = roomSockets.filter(s => s.id !== socket.id);
        console.log(`[video] Room ${callId} has ${otherSockets.length} other participants`);
        
        if (otherSockets.length > 0) {
          socket.to(callId).emit("signal", { fromUserId: userId, data });
          console.log(`[video] ✅ Signal forwarded to ${otherSockets.length} participants`);
        } else {
          // Buffer the signal for when other participants join
          console.log(`[video] 🔍 DEBUG: No other participants, attempting to buffer signal...`);
          if (!userId) {
            console.warn(`[video] Cannot buffer signal - userId is undefined`);
            return;
          }
          if (!signalBuffer.has(callId)) {
            signalBuffer.set(callId, []);
            console.log(`[video] 🔍 DEBUG: Created new signal buffer for room ${callId}`);
          }
          signalBuffer.get(callId)!.push({ fromUserId: userId, data, timestamp: new Date() });
          console.log(`[video] 📦 Signal buffered for room ${callId} (${signalBuffer.get(callId)!.length} signals buffered)`);
        }
      }).catch(error => {
        console.error(`[video] Error checking room participants:`, error);
      });
    });

    // leave_call: remove from room and notify others
    // payload: { callId: string }
    socket.on("leave_call", async ({ callId }: { callId: string }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log("[/video] leave_call", { socket: socket.id, userId, callId });
      }
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:leave")) return;
      socket.leave(callId);
      if (userId && presence) {
        await presence.removeMemberFromRoom(callId, userId);
      }
      
      // Clean up call state if no one is in the room
      setTimeout(async () => {
        const roomSockets = await video.in(callId).fetchSockets();
        if (roomSockets.length === 0) {
          activeCalls.delete(callId);
          // Clean up signal buffer for this call
          signalBuffer.delete(callId);
          console.log(`[video] Call ${callId} cleaned up - no participants, signal buffer cleared`);
        }
      }, 1000);
      
      try {
        if (userId) {
          const { CallService } = await import("../realtime/call.service");
          await CallService.leaveCall(callId, userId);
        }
      } catch {}
      socket.to(callId).emit("peer_left", { userId });
    });

    // Handle explicit peer_left event (when user clicks "Leave Call" button)
    socket.on("peer_left", async ({ callId }: { callId: string }) => {
      console.log(`[video] 🔴 User ${userId} explicitly left call ${callId} via peer_left event`);
      console.log(`[video] 🔴 Active calls before cleanup:`, Array.from(activeCalls));
      
      // Notify other participants that the call has ended
      console.log(`[video] 🔴 Emitting call_ended to room ${callId}`);
      socket.to(callId).emit("call_ended", { 
        userId, 
        reason: "User ended the call",
        endedBy: userId 
      });
      
      // Also emit to the video namespace to ensure all participants get the event
      video.to(callId).emit("call_ended", { 
        userId, 
        reason: "User ended the call",
        endedBy: userId 
      });
      
      // Clean up the call immediately since it's been explicitly ended
      activeCalls.delete(callId);
      console.log(`[video] 🔴 Call ${callId} ended by user ${userId} - call cleaned up`);
      console.log(`[video] 🔴 Active calls after cleanup:`, Array.from(activeCalls));
    });

    socket.on("disconnect", async () => {
      if (userId) {
        const userInfo = connectedUsers.get(userId);
        if (userInfo) {
          // Remove video socket but keep user if they're still on chat
          userInfo.videoSocketId = undefined;
          userInfo.lastSeen = new Date();
          
          // Only delete entirely if no sockets remain
          if (!userInfo.chatSocketId) {
            connectedUsers.delete(userId);
            
            // Emit offline status only when fully disconnected
            chat.emit("user_status_change", {
              userId: userId,
              status: "offline",
              lastSeen: new Date(),
            });
          } else {
            // Still connected via chat, update lastSeen
            connectedUsers.set(userId, userInfo);
          }
        }
        
        if (presence) await presence.markSocketOffline(userId, socket.id);
        logConnectedUsers("video namespace disconnection");
        
        // Clean up any active calls this user was part of
        console.log(`[video] User ${userId} disconnecting - active calls:`, Array.from(activeCalls));
        
        // Only check calls that this user was actually in
        const userCallIds = Array.from(activeCalls).filter(callId => 
          callId.includes(userId)
        );
        
        console.log(`[video] User ${userId} disconnecting - checking calls:`, userCallIds);
        
        for (const callId of userCallIds) {
          try {
            const roomSockets = await video.in(callId).fetchSockets();
            console.log(`[video] Checking call ${callId} - found ${roomSockets.length} remaining participants`);
            
            if (roomSockets.length === 0) {
              activeCalls.delete(callId);
              console.log(`[video] Call ${callId} cleaned up after user disconnect - no remaining participants`);
            } else {
              // Notify remaining participants that this user has disconnected
              console.log(`[video] Notifying remaining participants in call ${callId} that user ${userId} disconnected`);
              socket.to(callId).emit("peer_left", { userId });
            }
          } catch (error) {
            console.error(`[video] Error cleaning up call ${callId}:`, error);
          }
        }
        
        // Also check if this user was in any rooms and notify those rooms directly
        const rooms = Array.from(socket.rooms);
        console.log(`[video] User ${userId} was in rooms:`, rooms);
        
        for (const room of rooms) {
          if (room !== socket.id && room.includes(':')) { // This looks like a call ID
            try {
              const roomSockets = await video.in(room).fetchSockets();
              console.log(`[video] Room ${room} has ${roomSockets.length} participants after user ${userId} disconnect`);
              
              if (roomSockets.length > 0) {
                console.log(`[video] Notifying room ${room} that user ${userId} disconnected`);
                socket.to(room).emit("peer_left", { userId });
              }
            } catch (error) {
              console.error(`[video] Error checking room ${room}:`, error);
            }
          }
        }
      }
    });
  });

  return io;
}

// Function to get user online status
export function getUserOnlineStatus(userId: string): {
  isOnline: boolean;
  lastSeen?: Date;
} {
  const user = connectedUsers.get(userId);
  if (user && (user.chatSocketId || user.videoSocketId)) {
    return { isOnline: true, lastSeen: user.lastSeen };
  }
  return { isOnline: false };
}

// Function to get all connected users
export function getConnectedUsers(): string[] {
  return Array.from(connectedUsers.keys());
}

export { io };
