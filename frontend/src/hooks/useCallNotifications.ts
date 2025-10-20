import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
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
          console.log("[call-notifications] Setting incoming call state...");
          setIncomingCall({
            callId: data.callId,
            fromUserId: data.fromUserId,
            fromUserName: data.fromUserName,
            timestamp: new Date(),
          });
          console.log("[call-notifications] Incoming call state set successfully");
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
    
    // Open the call page
    const origin = window.location.origin;
    const url = `${origin}/call/${encodeURIComponent(incomingCall.callId)}`;
    const features = [
      "noopener",
      "noreferrer", 
      "resizable=yes",
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "width=1200",
      "height=800",
    ].join(",");
    
    window.open(url, "videocall", features);
    setIncomingCall(null);
  }, [incomingCall]);

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
