import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Props = { 
  localStream: MediaStream | null; 
  remoteStream: MediaStream | null; 
  remotePeerJoined: boolean;
  localVideoEnabled: boolean;
};

export const VideoCallPanel: React.FC<Props> = ({ localStream, remoteStream, remotePeerJoined, localVideoEnabled }) => {
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
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <video ref={remoteRef} className="cl-remote" autoPlay playsInline />
      {localVideoEnabled && (
        <video ref={localRef} className="cl-local" autoPlay playsInline muted />
      )}
      
      {/* Waiting for remote peer overlay */}
      {!remoteStream && !remotePeerJoined && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          zIndex: 10
        }}>
          {/* Indeterminate spinner */}
          <div style={{ 
            width: "48px", 
            height: "48px", 
            border: "4px solid rgba(255, 255, 255, 0.1)", 
            borderTop: "4px solid rgb(37 99 235)", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            marginBottom: "16px"
          }} />
          <div style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
            Waiting for user to join...
          </div>
          <div style={{ fontSize: "14px", opacity: 0.7 }}>
            Please wait while we connect you
          </div>
        </div>
      )}
    </div>
  );
};


