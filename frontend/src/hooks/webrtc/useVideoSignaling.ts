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
    console.log("[signal] emit leave_call", { callId });
    socketRef.current.emit("leave_call", { callId });
  }, [callId]);

  const sendSignal = useCallback((data: SignalData) => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit", data?.type, data);
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

  const initiateCall = useCallback((targetUserId: string) => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] initiate_call", { callId, targetUserId });
    socketRef.current.emit("initiate_call", { callId, targetUserId });
  }, [callId]);

  const emitPeerLeft = useCallback(() => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit peer_left", { callId });
    socketRef.current.emit("peer_left", { callId });
  }, [callId]);

  return { connected, join, leave, sendSignal, initiateCall, emitPeerLeft, onPeerJoined, onPeerLeft, onSignal };
}


