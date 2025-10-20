import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCallStore } from "@/store/callStore";
import { Socket } from "socket.io-client";
import { SocketManager } from "../services/socketManager";

interface IncomingCall {
  callId: string;
  fromUserId: string;
  fromUserName: string;
  timestamp: Date;
}

export function useCallNotifications() {
  const { token, user } = useAuthStore();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    const SOCKET_BASE_URL = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
    console.log("[call-notifications] Initializing with centralized manager");

    // Initialize socket manager if not already done
    if (!SocketManager.isSocketConnected()) {
      SocketManager.initialize({
        url: SOCKET_BASE_URL,
        token: token,
      });
    }

    // Get video socket from manager
    const videoSocket = SocketManager.getVideoSocket();
    if (!videoSocket) {
      console.error("[call-notifications] Failed to get video socket from manager");
      setSocket(null);
      return;
    }

    setSocket(videoSocket);

    // Register call notification handlers with the centralized socket manager
    SocketManager.registerHandlers({
      video: {
        onIncomingCall: (data: { 
          callId: string; 
          fromUserId: string; 
          fromUserName: string; 
        }) => {
          console.log("[call-notifications] Incoming call received:", data);
          console.log("[call-notifications] Current user:", user?.id);
          console.log("[call-notifications] Call target user:", data.fromUserId);
          
          // Check if user is already in another call
          const { activeCallId } = useCallStore.getState();
          if (activeCallId && activeCallId !== data.callId) {
            console.log("[call-notifications] User already in call, auto-declining new call");
            // Auto-decline the incoming call since user is busy
            if (videoSocket) {
              videoSocket.emit("decline_call", { 
                callId: data.callId, 
                fromUserId: data.fromUserId 
              });
            }
            return;
          }
          
          // Only show notification if user is not already in a call popup
          // This prevents automatic notifications when user is already in a call
          if (!activeCallId) {
            console.log("[call-notifications] Setting incoming call state...");
            setIncomingCall({
              callId: data.callId,
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName,
              timestamp: new Date(),
            });
            console.log("[call-notifications] Incoming call state set successfully");
          } else {
            console.log("[call-notifications] User already in call popup, not showing notification");
          }
        },
        onCallCancelled: (data: { callId: string }) => {
          console.log("[call-notifications] Call cancelled:", data);
          if (incomingCall?.callId === data.callId) {
            setIncomingCall(null);
          }
        },
      },
    });

    return () => {
      // Don't disconnect the socket - let the manager handle it
      setSocket(null);
    };
  }, [token, user]);

  const answerCall = useCallback(() => {
    if (!incomingCall) return;
    
    // Open the call page as receiver (NOT initiator)
    // Pass the initiator ID (fromUserId) and false for isInitiator
    import("@/utils/openCallPopup").then(({ openCallPopup }) => {
      openCallPopup(incomingCall.callId, incomingCall.fromUserId, false); // Pass initiator ID and false for isInitiator
    });
    setIncomingCall(null);
  }, [incomingCall, user?.id]);

  const declineCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    
    // Notify the caller that the call was declined
    socket.emit("decline_call", { 
      callId: incomingCall.callId,
      fromUserId: incomingCall.fromUserId 
    });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  const dismissNotification = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    answerCall,
    declineCall,
    dismissNotification,
  };
}
