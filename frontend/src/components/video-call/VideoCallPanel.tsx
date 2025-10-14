import React, { useEffect, useRef } from "react";

type Props = { localStream: MediaStream | null; remoteStream: MediaStream | null };

export const VideoCallPanel: React.FC<Props> = ({ localStream, remoteStream }) => {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <video ref={remoteRef} className="cl-remote" autoPlay playsInline />
      <video ref={localRef} className="cl-local" autoPlay playsInline muted />
    </div>
  );
};


