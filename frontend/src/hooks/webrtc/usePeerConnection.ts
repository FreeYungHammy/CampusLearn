import { useEffect, useRef, useState } from "react";
import http from "../../services/http";
import { getApiUrl } from "../../config/env";

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

  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('callPreferences');
      if (savedPreferences) {
        const { videoEnabled: savedVideo, audioEnabled: savedAudio } = JSON.parse(savedPreferences);
        setVideoEnabled(savedVideo);
        setAudioEnabled(savedAudio);
      }
    } catch (error) {
      console.warn('Failed to load call preferences from localStorage:', error);
    }
  }, []);
  
  // Update ref when localStream changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // Empty dependency array - cleanup only on unmount

  const init = async (opts: InitOptions = {}) => {
    // Prevent multiple initializations
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      console.log('[webrtc] Peer connection already initialized, skipping');
      return;
    }

    console.log('[webrtc] Initializing peer connection...');
    const iceConfigUrl = getApiUrl("/api/videos/ice-config");
    console.log('[webrtc] Fetching ICE config from:', iceConfigUrl);
    
    let pc: RTCPeerConnection;
    try {
      const { data: cfg } = await http.get<IceConfigResponse>(iceConfigUrl);
      console.log('[webrtc] ICE config received:', cfg);
      
      pc = new RTCPeerConnection({ iceServers: cfg.iceServers });
      pcRef.current = pc;
      console.log('[webrtc] Peer connection created successfully');
      console.log('[webrtc] PC ref set to:', !!pcRef.current);
      console.log('[webrtc] PC ref current value:', pcRef.current);
      console.log('[webrtc] PC signaling state:', pc.signalingState);
    } catch (error) {
      console.error('[webrtc] Failed to initialize peer connection:', error);
      throw error;
    }

    pc.ontrack = (e) => {
      console.log('[webrtc] Remote track received:', e.track.kind);
      const stream = remoteStream || new MediaStream();
      e.streams[0]?.getTracks().forEach((t) => stream.addTrack(t));
      setRemoteStream(stream);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('[webrtc] Local ICE candidate:', {
          type: e.candidate.type,
          protocol: e.candidate.protocol,
          address: e.candidate.address,
          port: e.candidate.port
        });
      }
      // handled by caller via signaling hook
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[webrtc] ICE connection state changed:', pc.iceConnectionState);
      setIceConnState(pc.iceConnectionState);
      
      // Update connection quality based on ICE connection state
      let quality: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'; details: string } = { score: 0, status: 'unknown', details: 'Connecting...' };
      switch (pc.iceConnectionState) {
        case 'connected':
          quality = { score: 100, status: 'excellent' as const, details: 'Connected' };
          break;
        case 'completed':
          quality = { score: 95, status: 'excellent' as const, details: 'Connection established' };
          break;
        case 'checking':
          quality = { score: 50, status: 'fair' as const, details: 'Establishing connection...' };
          break;
        case 'disconnected':
          quality = { score: 30, status: 'poor' as const, details: 'Connection lost' };
          break;
        case 'failed':
          quality = { score: 0, status: 'poor' as const, details: 'Connection failed' };
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
      console.log('[webrtc] ICE gathering state changed:', pc.iceGatheringState);
      setIceGatherState(pc.iceGatheringState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[webrtc] Connection state changed:', pc.connectionState);
      setPcState(pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      setPcState(pc.signalingState);
      console.log("[webrtc] signalingState:", pc.signalingState);
    };

    // Media will be added separately via addLocalStream function
    // This allows the peer connection to be initialized without requesting media immediately
  };

  const addLocalStream = async (opts: InitOptions = {}) => {
    if (!pcRef.current) throw new Error("PC not initialized");
    
    const media = await navigator.mediaDevices.getUserMedia({
      audio: opts.audioDeviceId ? { deviceId: { exact: opts.audioDeviceId } } : true,
      video: {
        ...(opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : {}),
        width: 1280,
        height: 720,
        frameRate: 30,
      } as MediaTrackConstraints,
    });
    
    // Apply saved preferences to tracks
    const audioTrack = media.getAudioTracks()[0];
    const videoTrack = media.getVideoTracks()[0];
    
    if (audioTrack) {
      audioTrack.enabled = audioEnabled;
      const s = pcRef.current!.addTrack(audioTrack, media);
      audioSenderRef.current = s;
    }
    
    if (videoTrack) {
      videoTrack.enabled = videoEnabled;
      const s = pcRef.current!.addTrack(videoTrack, media);
      videoSenderRef.current = s;
    }
    
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
    
    // Save to localStorage
    try {
      const preferences = { videoEnabled, audioEnabled: next };
      localStorage.setItem('callPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save audio preference to localStorage:', error);
    }
    
    return next;
  };

  const toggleCam = () => {
    if (!localStream) return false;
    const track = localStream.getVideoTracks()[0];
    if (!track) return false;
    const next = !track.enabled;
    track.enabled = next;
    setVideoEnabled(next);
    
    // Save to localStorage
    try {
      const preferences = { videoEnabled: next, audioEnabled };
      localStorage.setItem('callPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save video preference to localStorage:', error);
    }
    
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
    addLocalStream, // Add the missing function
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


