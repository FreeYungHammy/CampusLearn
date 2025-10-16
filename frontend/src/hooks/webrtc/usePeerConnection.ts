import { useEffect, useRef, useState } from "react";
import http from "../../services/http";

type IceConfigResponse = { iceServers: RTCIceServer[] };
type InitOptions = { audioDeviceId?: string; videoDeviceId?: string };

export function usePeerConnection() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pcState, setPcState] = useState<string>("new");
  const [iceConnState, setIceConnState] = useState<string>("new");
  const [iceGatherState, setIceGatherState] = useState<string>("new");
  const [connectionQuality, setConnectionQuality] = useState<{
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    details: string;
  }>({ score: 0, status: 'unknown', details: 'Connecting...' });
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  const init = async (opts: InitOptions = {}) => {
    // Hardcode the base URL to avoid environment variable issues
    const baseURL = "http://localhost:5001/api";
    const { data: cfg } = await http.get<IceConfigResponse>(`${baseURL}/videos/ice-config`);
    const pc = new RTCPeerConnection({ iceServers: cfg.iceServers });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      const stream = remoteStream || new MediaStream();
      e.streams[0]?.getTracks().forEach((t) => stream.addTrack(t));
      setRemoteStream(stream);
    };

    pc.onicecandidate = (e) => {
      // handled by caller via signaling hook
    };

    pc.onsignalingstatechange = () => {
      setPcState(pc.signalingState);
      console.log("[webrtc] signalingState:", pc.signalingState);
    };
    pc.oniceconnectionstatechange = () => {
      setIceConnState(pc.iceConnectionState);
      console.log("[webrtc] iceConnectionState:", pc.iceConnectionState);
      
      // Update connection quality based on ICE connection state
      let quality = { score: 0, status: 'unknown' as const, details: 'Connecting...' };
      switch (pc.iceConnectionState) {
        case 'connected':
          quality = { score: 100, status: 'excellent', details: 'Connected' };
          break;
        case 'completed':
          quality = { score: 95, status: 'excellent', details: 'Connection established' };
          break;
        case 'checking':
          quality = { score: 50, status: 'fair', details: 'Establishing connection...' };
          break;
        case 'disconnected':
          quality = { score: 30, status: 'poor', details: 'Connection lost' };
          break;
        case 'failed':
          quality = { score: 0, status: 'poor', details: 'Connection failed' };
          // Trigger reconnection attempt
          setTimeout(() => attemptReconnection(), 2000);
          break;
        case 'closed':
          quality = { score: 0, status: 'unknown', details: 'Connection closed' };
          break;
      }
      setConnectionQuality(quality);
    };
    pc.onicegatheringstatechange = () => {
      setIceGatherState(pc.iceGatheringState);
      console.log("[webrtc] iceGatheringState:", pc.iceGatheringState);
    };

    const media = await navigator.mediaDevices.getUserMedia({
      audio: opts.audioDeviceId ? { deviceId: { exact: opts.audioDeviceId } } : true,
      video: {
        ...(opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : {}),
        width: 1280,
        height: 720,
        frameRate: 30,
      } as MediaTrackConstraints,
    });
    media.getAudioTracks().forEach((t) => {
      const s = pc.addTrack(t, media);
      if (t.kind === "audio") audioSenderRef.current = s;
    });
    media.getVideoTracks().forEach((t) => {
      const s = pc.addTrack(t, media);
      if (t.kind === "video") videoSenderRef.current = s;
    });
    setLocalStream(media);
  };

  const createOffer = async () => {
    if (!pcRef.current) throw new Error("PC not initialized");
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    return offer;
  };

  const createAnswer = async () => {
    if (!pcRef.current) throw new Error("PC not initialized");
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    return answer;
  };

  const setRemoteDescription = async (desc: RTCSessionDescriptionInit) => {
    if (!pcRef.current) throw new Error("PC not initialized");
    await pcRef.current.setRemoteDescription(desc);
  };

  const addIceCandidate = async (c: RTCIceCandidateInit) => {
    if (!pcRef.current) throw new Error("PC not initialized");
    await pcRef.current.addIceCandidate(c);
  };

  const toggleMic = () => {
    if (!localStream) return false;
    const track = localStream.getAudioTracks()[0];
    if (!track) return false;
    const next = !track.enabled;
    track.enabled = next;
    setAudioEnabled(next);
    return next;
  };

  const toggleCam = () => {
    if (!localStream) return false;
    const track = localStream.getVideoTracks()[0];
    if (!track) return false;
    const next = !track.enabled;
    track.enabled = next;
    setVideoEnabled(next);
    return next;
  };

  const toggleScreenShare = async () => {
    if (!videoSenderRef.current) return false;
    try {
      if (!isScreenSharing) {
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: { cursor: "always" }, audio: false });
        const screenTrack = screen.getVideoTracks()[0];
        await videoSenderRef.current.replaceTrack(screenTrack);
        screenTrack.onended = async () => {
          await toggleScreenShare();
        };
        setIsScreenSharing(true);
        return true;
      } else {
        const cam = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, frameRate: 30 } });
        const camTrack = cam.getVideoTracks()[0];
        await videoSenderRef.current.replaceTrack(camTrack);
        setIsScreenSharing(false);
        return false;
      }
    } catch {
      return isScreenSharing;
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!videoSenderRef.current) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
    const newTrack = stream.getVideoTracks()[0];
    await videoSenderRef.current.replaceTrack(newTrack);
    if (localStream) {
      const old = localStream.getVideoTracks()[0];
      if (old) localStream.removeTrack(old);
      localStream.addTrack(newTrack);
      setLocalStream(localStream.clone());
    }
    return true;
  };

  const switchMicrophone = async (deviceId: string) => {
    if (!audioSenderRef.current) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
    const newTrack = stream.getAudioTracks()[0];
    await audioSenderRef.current.replaceTrack(newTrack);
    if (localStream) {
      const old = localStream.getAudioTracks()[0];
      if (old) localStream.removeTrack(old);
      localStream.addTrack(newTrack);
      setLocalStream(localStream.clone());
    }
    return true;
  };

  const attemptReconnection = async () => {
    if (reconnectAttempts >= 3 || isReconnecting) return;
    
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    setConnectionQuality({ score: 0, status: 'unknown', details: `Reconnecting... (${reconnectAttempts + 1}/3)` });
    
    try {
      // Close existing connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize the connection
      await init();
      
      setReconnectAttempts(0);
      setConnectionQuality({ score: 100, status: 'excellent', details: 'Reconnected successfully' });
    } catch (error) {
      console.error("[webrtc] Reconnection failed:", error);
      setConnectionQuality({ score: 0, status: 'poor', details: 'Reconnection failed' });
      
      // Try again after a delay
      if (reconnectAttempts < 2) {
        setTimeout(() => attemptReconnection(), 3000);
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  return {
    pcRef,
    localStream,
    remoteStream,
    pcState,
    iceConnState,
    iceGatherState,
    connectionQuality,
    reconnectAttempts,
    isReconnecting,
    attemptReconnection,
    init,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
    videoEnabled,
    audioEnabled,
    isScreenSharing,
  };
}


