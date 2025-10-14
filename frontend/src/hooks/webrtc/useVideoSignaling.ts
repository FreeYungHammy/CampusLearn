import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type SignalData = { type: string; sdp?: string; candidate?: RTCIceCandidateInit };

export function useVideoSignaling(callId: string | undefined, token: string | undefined) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      console.warn("[signal] no token available for /video namespace");
      return;
    }
    const base = import.meta.env.VITE_WS_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
    const url = base.replace(/^http/, "ws");
    console.log("[signal] connecting", { url: `${url}/video`, hasToken: !!token });
    const socket = io(`${url}/video`, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (e: any) => {
      console.warn("[signal] connect_error", e?.message || e);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const join = (role?: "tutor" | "student" | "guest") => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit join_call", { callId, role });
    socketRef.current.emit("join_call", { callId, role });
  };
  const leave = () => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit leave_call", { callId });
    socketRef.current.emit("leave_call", { callId });
  };
  const sendSignal = (data: SignalData) => {
    if (!socketRef.current || !callId) return;
    console.log("[signal] emit", data?.type);
    socketRef.current.emit("signal", { callId, data });
  };

  const onPeerJoined = (handler: (payload: { userId?: string }) => void) => {
    socketRef.current?.on("peer_joined", (p) => { console.log("[signal] peer_joined", p); handler(p); });
  };
  const onPeerLeft = (handler: (payload: { userId?: string }) => void) => {
    socketRef.current?.on("peer_left", (p) => { console.log("[signal] peer_left", p); handler(p); });
  };
  const onSignal = (handler: (payload: { fromUserId?: string; data: SignalData }) => void) => {
    socketRef.current?.on("signal", (p) => { console.log("[signal] inbound", p?.data?.type); handler(p); });
  };

  return { connected, join, leave, sendSignal, onPeerJoined, onPeerLeft, onSignal };
}


