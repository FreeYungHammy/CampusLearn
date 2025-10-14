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

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  const init = async (opts: InitOptions = {}) => {
    const { data: cfg } = await http.get<IceConfigResponse>(`/videos/ice-config`);
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

  return {
    pcRef,
    localStream,
    remoteStream,
    pcState,
    iceConnState,
    iceGatherState,
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


