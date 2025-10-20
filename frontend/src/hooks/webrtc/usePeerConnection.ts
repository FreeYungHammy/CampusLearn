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
  const [speedMetrics, setSpeedMetrics] = useState<{
    downloadMbps: number;
    uploadMbps: number;
  }>({ downloadMbps: 0, uploadMbps: 0 });
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

  // Collect stats periodically when connected
  useEffect(() => {
    if (pcRef.current && iceConnState === 'connected') {
      const interval = setInterval(collectStats, 2000); // Every 2 seconds
      return () => clearInterval(interval);
    }
  }, [iceConnState]);

  // Monitor screen sharing state to ensure it stays in sync
  useEffect(() => {
    if (!videoSenderRef.current) return;

    const checkScreenShareState = () => {
      try {
        const sender = videoSenderRef.current;
        if (sender && sender.track) {
          const track = sender.track;
          const isCurrentlyScreenSharing = track.kind === 'video' && track.label.includes('screen');
          
          if (isCurrentlyScreenSharing !== isScreenSharing) {
            console.log('[webrtc] Screen share state mismatch detected, syncing:', isCurrentlyScreenSharing);
            setIsScreenSharing(isCurrentlyScreenSharing);
          }
        }
      } catch (error) {
        console.warn('[webrtc] Failed to check screen share state:', error);
      }
    };

    const interval = setInterval(checkScreenShareState, 1000); // Check every second
    return () => clearInterval(interval);
  }, [isScreenSharing]);

  // Track media track state changes to sync button states
  useEffect(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];

    const handleAudioTrackChange = () => {
      if (audioTrack) {
        console.log('[webrtc] Audio track enabled changed:', audioTrack.enabled);
        setAudioEnabled(audioTrack.enabled);
      }
    };

    const handleVideoTrackChange = () => {
      if (videoTrack) {
        console.log('[webrtc] Video track enabled changed:', videoTrack.enabled);
        setVideoEnabled(videoTrack.enabled);
      }
    };

    // Listen for track state changes
    if (audioTrack) {
      audioTrack.addEventListener('ended', handleAudioTrackChange);
      audioTrack.addEventListener('mute', handleAudioTrackChange);
      audioTrack.addEventListener('unmute', handleAudioTrackChange);
    }

    if (videoTrack) {
      videoTrack.addEventListener('ended', handleVideoTrackChange);
      videoTrack.addEventListener('mute', handleVideoTrackChange);
      videoTrack.addEventListener('unmute', handleVideoTrackChange);
    }

    // Periodic sync check to ensure states stay in sync
    const syncInterval = setInterval(() => {
      if (audioTrack && audioTrack.enabled !== audioEnabled) {
        console.log('[webrtc] Audio state mismatch detected, syncing:', audioTrack.enabled);
        setAudioEnabled(audioTrack.enabled);
      }
      if (videoTrack && videoTrack.enabled !== videoEnabled) {
        console.log('[webrtc] Video state mismatch detected, syncing:', videoTrack.enabled);
        setVideoEnabled(videoTrack.enabled);
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(syncInterval);
      if (audioTrack) {
        audioTrack.removeEventListener('ended', handleAudioTrackChange);
        audioTrack.removeEventListener('mute', handleAudioTrackChange);
        audioTrack.removeEventListener('unmute', handleAudioTrackChange);
      }
      if (videoTrack) {
        videoTrack.removeEventListener('ended', handleVideoTrackChange);
        videoTrack.removeEventListener('mute', handleVideoTrackChange);
        videoTrack.removeEventListener('unmute', handleVideoTrackChange);
      }
    };
  }, [localStream, audioEnabled, videoEnabled]);
  
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
      
      if (!cfg.iceServers || cfg.iceServers.length === 0) {
        throw new Error("No ICE servers configured");
      }
      
      pc = new RTCPeerConnection({ iceServers: cfg.iceServers });
      pcRef.current = pc;
      console.log('[webrtc] Peer connection created successfully with', cfg.iceServers.length, 'ICE servers');
      console.log('[webrtc] PC ref set to:', !!pcRef.current);
      console.log('[webrtc] PC ref current value:', pcRef.current);
      console.log('[webrtc] PC signaling state:', pc.signalingState);
    } catch (error) {
      console.error('[webrtc] ICE config failed, using fallback STUN servers:', error);
      // Fallback to basic STUN servers
      const fallbackServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ];
      
      pc = new RTCPeerConnection({ iceServers: fallbackServers });
      pcRef.current = pc;
      console.log('[webrtc] Peer connection created with fallback STUN servers');
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
        case 'new':
          quality = { score: 0, status: 'unknown', details: 'Connecting...' };
          break;
        case 'checking':
          quality = { score: 25, status: 'unknown', details: 'Establishing connection...' };
          break;
        case 'connected':
          quality = { score: 100, status: 'excellent' as const, details: 'Connected' };
          break;
        case 'completed':
          quality = { score: 95, status: 'excellent' as const, details: 'Connection established' };
          break;
        case 'disconnected':
          quality = { score: 30, status: 'poor' as const, details: 'Connection lost - attempting recovery...' };
          // More conservative disconnect detection - only trigger after longer timeout
          // and only if we've been disconnected for a while without recovery
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log('[webrtc] ICE still disconnected after 10 seconds - checking for recovery');
              // Give it another chance to recover
              setTimeout(() => {
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                  console.log('[webrtc] ICE connection failed to recover - triggering disconnect handler');
                  window.dispatchEvent(new CustomEvent('peer-disconnected', { 
                    detail: { reason: 'ice-disconnected-permanent' } 
                  }));
                } else {
                  console.log('[webrtc] ICE connection recovered!');
                }
              }, 5000); // Additional 5 seconds for recovery
            }
          }, 10000); // Increased from 3 to 10 seconds
          break;
        case 'failed':
          quality = { score: 0, status: 'poor' as const, details: 'Connection failed - attempting recovery...' };
          // More conservative failure handling - try recovery first
          setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
              console.log('[webrtc] ICE connection failed - attempting reconnection');
              attemptReconnection();
            }
          }, 3000); // Wait 3 seconds before attempting recovery
          break;
        case 'closed':
          quality = { score: 0, status: 'unknown', details: 'Connection closed' };
          // Trigger disconnect detection
          console.log('[webrtc] Peer connection closed - triggering disconnect handler');
          window.dispatchEvent(new CustomEvent('peer-disconnected', { 
            detail: { reason: 'connection-closed' } 
          }));
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
      
      // Handle connection state changes more gracefully
      switch (pc.connectionState) {
        case 'connected':
          console.log('[webrtc] Peer connection established successfully');
          setIsReconnecting(false);
          break;
        case 'connecting':
          console.log('[webrtc] Peer connection in progress...');
          break;
        case 'disconnected':
          console.log('[webrtc] Peer connection disconnected - monitoring for recovery');
          // Don't immediately trigger disconnect - let ICE state handle it
          break;
        case 'failed':
          console.log('[webrtc] Peer connection failed - will attempt recovery via ICE state handler');
          break;
        case 'closed':
          console.log('[webrtc] Peer connection closed');
          break;
      }
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
        
        // Handle when user stops screen sharing from browser controls
        screenTrack.onended = async () => {
          console.log('[webrtc] Screen sharing ended by user');
          try {
            // Switch back to camera
            const cam = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: 1280, 
                height: 720, 
                frameRate: 30 
              } 
            });
            const camTrack = cam.getVideoTracks()[0];
            if (videoSenderRef.current) {
              await videoSenderRef.current.replaceTrack(camTrack);
            }
            setIsScreenSharing(false);
            
            // Update local stream
            if (localStream) {
              const oldVideoTrack = localStream.getVideoTracks()[0];
              if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
              localStream.addTrack(camTrack);
              setLocalStream(localStream.clone());
            }
          } catch (error) {
            console.error('[webrtc] Failed to switch back to camera after screen share ended:', error);
            setIsScreenSharing(false);
          }
        };
        
        setIsScreenSharing(true);
        return true;
      } else {
        const cam = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 1280, 
            height: 720, 
            frameRate: 30 
          } 
        });
        const camTrack = cam.getVideoTracks()[0];
        await videoSenderRef.current.replaceTrack(camTrack);
        setIsScreenSharing(false);
        
        // Update local stream
        if (localStream) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
          localStream.addTrack(camTrack);
          setLocalStream(localStream.clone());
        }
        
        return false;
      }
    } catch (error) {
      console.error('[webrtc] Screen share toggle failed:', error);
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

  // Keep last totals to compute deltas for Mbps
  const lastInboundRef = useRef<{ bytes: number; ts: number } | null>(null);
  const lastOutboundRef = useRef<{ bytes: number; ts: number } | null>(null);

  const collectStats = async () => {
    if (!pcRef.current) return;
    try {
      const stats = await pcRef.current.getStats();
      let inboundBytes = 0;
      let outboundBytes = 0;
      let inboundTs = 0;
      let outboundTs = 0;

      stats.forEach((report) => {
        // Some browsers use report.kind; others mediaType
        const kind = (report as any).kind || (report as any).mediaType;
        if (report.type === 'inbound-rtp' && kind === 'video') {
          inboundBytes = (report as any).bytesReceived || 0;
          inboundTs = report.timestamp || 0;
        }
        if (report.type === 'outbound-rtp' && kind === 'video') {
          outboundBytes = (report as any).bytesSent || 0;
          outboundTs = report.timestamp || 0;
        }
      });

      // Compute Mbps from deltas
      let downloadMbps = 0;
      let uploadMbps = 0;
      if (inboundBytes && inboundTs && lastInboundRef.current) {
        const dt = (inboundTs - lastInboundRef.current.ts) / 1000; // seconds
        const db = inboundBytes - lastInboundRef.current.bytes; // bytes
        if (dt > 0 && db >= 0) downloadMbps = (db * 8) / (1024 * 1024 * dt);
      }
      if (outboundBytes && outboundTs && lastOutboundRef.current) {
        const dt = (outboundTs - lastOutboundRef.current.ts) / 1000;
        const db = outboundBytes - lastOutboundRef.current.bytes;
        if (dt > 0 && db >= 0) uploadMbps = (db * 8) / (1024 * 1024 * dt);
      }

      lastInboundRef.current = { bytes: inboundBytes, ts: inboundTs };
      lastOutboundRef.current = { bytes: outboundBytes, ts: outboundTs };

      setSpeedMetrics({ downloadMbps, uploadMbps });

      // Update connection quality based on bandwidth
      const nextStatus = downloadMbps > 2 && uploadMbps > 1
        ? 'excellent'
        : downloadMbps > 1 && uploadMbps > 0.5
          ? 'good'
          : downloadMbps > 0.5 && uploadMbps > 0.25
            ? 'fair'
            : 'poor';
      setConnectionQuality(prev => ({ ...prev, status: nextStatus as any, score: nextStatus === 'excellent' ? 100 : nextStatus === 'good' ? 80 : nextStatus === 'fair' ? 60 : 30 }));
    } catch (error) {
      console.warn('[webrtc] Failed to collect stats:', error);
    }
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
    speedMetrics,
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


