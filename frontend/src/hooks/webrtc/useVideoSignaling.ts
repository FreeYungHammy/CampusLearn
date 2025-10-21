import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { SocketManager, type SignalData } from "../../services/socketManager";

export function useVideoSignaling(callId: string | undefined, token: string | undefined) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<{
    onPeerJoined?: (payload: { userId?: string }) => void;
    onPeerLeft?: (payload: { userId?: string }) => void;
    onSignal?: (payload: { fromUserId?: string; data: SignalData }) => void;
    onCallEnded?: (payload: { userId?: string; reason?: string; endedBy?: string }) => void;
  }>({});

  useEffect(() => {
    if (!token) {
      console.warn("[signal] no token available for /video namespace");
      return;
    }

    const url = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
    console.log("[signal] initializing with centralized manager", { url, hasToken: !!token });

    // Initialize socket manager if not already done
    if (!SocketManager.isInitialized() || !SocketManager.isSocketConnected()) {
      console.log("[signal] Initializing socket manager...");
      SocketManager.initialize({
        url: url,
        token: token,
      });
    } else {
      console.log("[signal] Socket manager already initialized and connected");
    }

    // Get video socket from manager
    const videoSocket = SocketManager.getVideoSocket();
    if (!videoSocket) {
      console.error("[signal] Failed to get video socket from manager");
      setConnected(false);
      return;
    }
    
    console.log("[signal] Video socket obtained, setting up handlers...");

    socketRef.current = videoSocket;

    // Register video event handlers
    SocketManager.registerHandlers({
      video: {
        onConnectionChange: (connected: boolean) => {
          console.log(`[signal] Connection state changed: ${connected}`);
          setConnected(connected);
        },
        onSignal: (payload: { fromUserId?: string; data: SignalData }) => {
          console.log("[signal] Received signal:", payload.data?.type, payload);
          if (payload.data?.type === 'ice-candidate') {
            console.log("[signal] Remote ICE candidate received");
          } else if (payload.data?.type === 'offer') {
            console.log("[signal] Remote offer received");
          } else if (payload.data?.type === 'answer') {
            console.log("[signal] Remote answer received");
          }
          // Call registered handler if any
          handlersRef.current.onSignal?.(payload);
        },
        onPeerJoined: (payload: { userId?: string }) => {
          console.log("[signal] Peer joined:", payload);
          handlersRef.current.onPeerJoined?.(payload);
        },
        onPeerLeft: (payload: { userId?: string }) => {
          console.log("[signal] Peer left:", payload);
          handlersRef.current.onPeerLeft?.(payload);
        },
        onCallEnded: (payload: { userId?: string; reason?: string; endedBy?: string }) => {
          console.log("[signal] 🔴 Call ended event received in signaling:", payload);
          console.log("[signal] 🔴 onCallEnded handler exists:", !!handlersRef.current.onCallEnded);
          handlersRef.current.onCallEnded?.(payload);
        },
      },
    });

    setConnected(videoSocket.connected);

    return () => {
      // Don't disconnect the socket - let the manager handle it
      // Just clear our reference
      socketRef.current = null;
    };
  }, [token]);

  const join = useCallback((role?: "tutor" | "student" | "guest") => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit join_call", { callId, role });
    socketRef.current.emit("join_call", { callId, role });
  }, [callId]);

  const leave = useCallback(() => {
    if (!socketRef.current || !callId) return;
    
    // Check if socket is connected
    if (!socketRef.current.connected) {
      console.log("[signal] Socket not connected for leave_call, skipping");
      return;
    }
    
    console.log("[signal] emit leave_call", { callId });
    socketRef.current.emit("leave_call", { callId });
  }, [callId]);

  const sendSignal = useCallback((data: SignalData) => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] 📤 Sending signal:", data?.type, data);
    console.log("[signal] Socket connected:", socketRef.current.connected);
    console.log("[signal] CallId:", callId);
    socketRef.current.emit("signal", { callId, data });
  }, [callId]);

  const onPeerJoined = useCallback((handler: (payload: { userId?: string }) => void) => {
    handlersRef.current.onPeerJoined = handler;
  }, []);

  const onPeerLeft = useCallback((handler: (payload: { userId?: string }) => void) => {
    handlersRef.current.onPeerLeft = handler;
  }, []);

  const onSignal = useCallback((handler: (payload: { fromUserId?: string; data: SignalData }) => void) => {
    handlersRef.current.onSignal = handler;
  }, []);

  const onCallEnded = useCallback((handler: (payload: { userId?: string; reason?: string; endedBy?: string }) => void) => {
    console.log("[signal] 🔴 onCallEnded handler registered");
    handlersRef.current.onCallEnded = handler;
  }, []);

  const initiateCall = useCallback((targetUserId: string) => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] initiate_call", { callId, targetUserId });
    socketRef.current.emit("initiate_call", { callId, targetUserId });
  }, [callId]);

  const emitPeerLeft = useCallback(() => {
    if (!socketRef.current || !callId) {
      console.log("[signal] 🔴 Cannot emit peer_left - socket or callId missing", { 
        hasSocket: !!socketRef.current, 
        callId 
      });
      return;
    }
    
    // Check if socket is connected, if not try to reconnect
    if (!socketRef.current.connected) {
      console.log("[signal] 🔴 Socket not connected, attempting to reconnect...");
      // Try to reconnect the socket
      socketRef.current.connect();
      
      // Wait a bit for connection, then try to emit
      setTimeout(() => {
        if (socketRef.current?.connected) {
          console.log("[signal] 🔴 Socket reconnected, emitting peer_left event", { callId });
          socketRef.current.emit("peer_left", { callId });
        } else {
          console.log("[signal] 🔴 Socket still not connected, cannot emit peer_left");
        }
      }, 500);
      return;
    }
    
    console.log("[signal] 🔴 Emitting peer_left event", { callId });
    console.log("[signal] 🔴 Socket connected:", socketRef.current.connected);
    socketRef.current.emit("peer_left", { callId });
  }, [callId]);

  return { connected, join, leave, sendSignal, initiateCall, emitPeerLeft, onPeerJoined, onPeerLeft, onSignal, onCallEnded };
}


