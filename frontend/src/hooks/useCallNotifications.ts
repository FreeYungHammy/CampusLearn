import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { io, Socket } from "socket.io-client";

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

    // Hardcode the URL to avoid environment variable issues
    const SOCKET_BASE_URL = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
    const url = SOCKET_BASE_URL.replace(/^http/, "ws");
    
    const newSocket = io(`${url}/video`, { 
      auth: { token }, 
      transports: ["websocket", "polling"] 
    });
    
    setSocket(newSocket);

    // Listen for incoming call notifications
    newSocket.on("incoming_call", (data: { 
      callId: string; 
      fromUserId: string; 
      fromUserName: string; 
    }) => {
      console.log("[call-notifications] Incoming call:", data);
      setIncomingCall({
        callId: data.callId,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        timestamp: new Date(),
      });
    });

    newSocket.on("connect", () => {
      console.log("[call-notifications] Connected to video namespace");
    });

    newSocket.on("disconnect", () => {
      console.log("[call-notifications] Disconnected from video namespace");
    });

    newSocket.on("call_cancelled", (data: { callId: string }) => {
      console.log("[call-notifications] Call cancelled:", data);
      if (incomingCall?.callId === data.callId) {
        setIncomingCall(null);
      }
    });

    return () => {
      newSocket.disconnect();
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
