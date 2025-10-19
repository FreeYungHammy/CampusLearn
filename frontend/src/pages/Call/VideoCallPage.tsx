import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { VideoCallPanel } from "../../components/video-call/VideoCallPanel";
import { CallControls } from "../../components/video-call/CallControls";
import { PreJoinPanel } from "../../components/video-call/PreJoinPanel";
import "../../components/video-call/call.css";
import { usePeerConnection } from "../../hooks/webrtc/usePeerConnection";
import { useVideoSignaling } from "../../hooks/webrtc/useVideoSignaling";
import { useAuthStore } from "../../store/authStore";
import { SocketManager } from "../../services/socketManager";

export const VideoCallPage: React.FC = () => {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuthStore();
  const pc = usePeerConnection();
  const signaling = useVideoSignaling(callId, token || undefined);
  const [error, setError] = useState<string | null>(null);
  const [prejoinDone, setPrejoinDone] = useState(false);
  const [pendingInit, setPendingInit] = useState<{ audioDeviceId?: string; videoDeviceId?: string } | null>(null);

  useEffect(() => {
    document.title = `Call • ${callId ?? "Unknown"}`;
  }, [callId]);

  // initialize PC and bind signaling after prejoin selection
  useEffect(() => {
    (async () => {
      if (!prejoinDone || !pendingInit) return;
      try {
        console.log("[webrtc] Starting peer connection initialization...");
        await pc.init(pendingInit);
        console.log("[webrtc] Peer connection initialization completed");
        console.log("[webrtc] PC ref after init:", !!pc.pcRef.current);
        console.log("[webrtc] PC ref current value:", pc.pcRef.current);
        console.log("[webrtc] PC ref type:", typeof pc.pcRef.current);

        // outbound ICE
        const peerConnection = pc.pcRef.current;
        if (peerConnection) {
          peerConnection.onicecandidate = (e) => {
            if (e.candidate) {
              console.log("[webrtc] local ice-candidate", e.candidate.type, e.candidate.protocol);
              signaling.sendSignal({ type: "ice-candidate", candidate: e.candidate.toJSON() });
            }
          };
          peerConnection.onconnectionstatechange = () => {
            console.log("[webrtc] connection state:", peerConnection.connectionState);
          };
        }

        // inbound signaling
        signaling.onSignal(async ({ data }) => {
          console.log("[signal] received", data?.type);
          if (!data?.type) return;
          
          try {
            const peerConnection = pc.pcRef.current;
            if (!peerConnection) {
              console.error("[webrtc] No peer connection available for signaling");
              return;
            }

            if (data.type === "offer") {
              console.log("[webrtc] Processing remote offer");
              await peerConnection.setRemoteDescription({ type: "offer", sdp: data.sdp });
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              console.log("[webrtc] Created answer, sending back");
              signaling.sendSignal({ type: "answer", sdp: answer.sdp });
            } else if (data.type === "answer") {
              console.log("[webrtc] Processing remote answer");
              const currentState = peerConnection.signalingState;
              console.log("[webrtc] Current signaling state:", currentState);
              
              if (currentState === "have-local-offer") {
                await peerConnection.setRemoteDescription({ type: "answer", sdp: data.sdp });
                console.log("[webrtc] Remote answer set successfully");
              } else {
                console.warn("[webrtc] Ignoring answer - wrong signaling state:", currentState);
              }
            } else if (data.type === "ice-candidate" && data.candidate) {
              console.log("[webrtc] Adding remote ICE candidate");
              await peerConnection.addIceCandidate(data.candidate);
            }
          } catch (error) {
            console.error("[webrtc] Error processing signal:", error);
          }
        });

        // join room
        const role = user?.role === "tutor" || user?.role === "student" ? (user.role as any) : "guest";
        signaling.join(role);

            // Determine initiator based on URL parameter
            // The initiator is the user who clicked "Start Video Call" button
            const initiatorId = searchParams.get('initiator');
            const initiator = initiatorId === user?.id;
            console.log("[webrtc] initiator?", initiator, "initiatorId=", initiatorId, "user=", user?.id);
            
            // Send call notification if this is the initiator
            if (initiator && callId && user?.id) {
              try {
                const parts = (callId || "").split(":");
                const targetUserId = parts.find(id => id !== user.id);
                
                if (targetUserId) {
                  console.log("[video-call] Sending call notification to:", targetUserId);
                  
                  const videoSocket = SocketManager.getVideoSocket();
                  if (videoSocket && videoSocket.connected) {
                    console.log("[video-call] Sending initiate_call via centralized socket");
                    videoSocket.emit("initiate_call", { callId, targetUserId });
                    console.log("[video-call] Call notification sent successfully");
                  } else {
                    console.error("[video-call] Video socket not available or not connected");
                  }
                }
              } catch (error) {
                console.error("[video-call] Failed to send call notification:", error);
              }
            }
            
            if (initiator) {
              // Create offer after PC is initialized
              setTimeout(async () => {
                try {
                  console.log("[webrtc] Creating offer as initiator...");
                  console.log("[webrtc] PC ref exists:", !!pc.pcRef.current);
                  console.log("[webrtc] PC signaling state:", pc.pcRef.current?.signalingState);
                  console.log("[webrtc] PC connection state:", pc.pcRef.current?.connectionState);
                  
                  // Get the current peer connection
                  const peerConnection = pc.pcRef.current;
                  console.log("[webrtc] Got peer connection:", !!peerConnection);
                  
                  if (!peerConnection) {
                    console.error("[webrtc] Peer connection not initialized");
                    setError("Peer connection not initialized");
                    return;
                  }
                  
                  // Check if we already have a local offer (prevent duplicate offers)
                  const currentState = peerConnection.signalingState;
                  if (currentState === "have-local-offer") {
                    console.log("[webrtc] Already have local offer, skipping");
                    return;
                  }
                  
                  const offer = await peerConnection.createOffer();
                  await peerConnection.setLocalDescription(offer);
                  console.log("[webrtc] Offer created successfully:", offer.type);
                  console.log("[webrtc] Sending offer via signaling...");
                  signaling.sendSignal({ type: "offer", sdp: offer.sdp });
                  console.log("[webrtc] Offer sent successfully");
                } catch (e: any) {
                  console.error("[webrtc] Failed to create offer:", e);
                  setError(`Failed to create offer: ${e.message}`);
                }
              }, 500); // Reduced delay since we're now waiting for PC ref
            }
      } catch (e: any) {
        setError(e?.message || "Failed to initialize call");
      }
    })();
    return () => signaling.leave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, prejoinDone, pendingInit]);

  // Placeholder shell; hooks/components will be wired next
  return (
    <div className="cl-call-root">
      <header className="cl-call-header">
        <div>CampusLearn • Call</div>
        <div style={{ opacity: 0.7 }}>{callId}</div>
      </header>
      <main className="cl-stage">
        {!prejoinDone ? (
          <PreJoinPanel
            onCancel={() => window.close()}
            onConfirm={async (sel) => {
              console.log("[video-call] Join Call button clicked!");
              
              // Proceed with joining the call firstyo
              setPendingInit(sel);
              setPrejoinDone(true);
            }}
          />
        ) : (
          <>
            <VideoCallPanel localStream={pc.localStream} remoteStream={pc.remoteStream} />
            <div style={{ position: "absolute", left: 16, bottom: 16, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.08)", padding: "8px 10px", borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: pc.connectionQuality.status === 'excellent' ? '#10b981' : 
                                 pc.connectionQuality.status === 'good' ? '#3b82f6' :
                                 pc.connectionQuality.status === 'fair' ? '#f59e0b' : '#ef4444'
                }} />
                <span style={{ fontWeight: 500 }}>{pc.connectionQuality.details}</span>
                {pc.isReconnecting && (
                  <span style={{ color: '#f59e0b', fontSize: 10 }}>🔄 Reconnecting...</span>
                )}
              </div>
              <div>Signaling: {pc.pcState}</div>
              <div>ICE Conn: {pc.iceConnState}</div>
              <div>ICE Gather: {pc.iceGatherState}</div>
              {pc.reconnectAttempts > 0 && (
                <div style={{ color: '#f59e0b' }}>Reconnect attempts: {pc.reconnectAttempts}/3</div>
              )}
            </div>
            <CallControls
              onToggleMic={() => pc.toggleMic()}
              onToggleCam={() => pc.toggleCam()}
              onToggleScreenshare={() => pc.toggleScreenShare()}
              onLeave={() => window.close()}
              onReconnect={() => pc.attemptReconnection()}
              micOn={pc.audioEnabled}
              camOn={pc.videoEnabled}
              sharing={pc.isScreenSharing}
              isReconnecting={pc.isReconnecting}
            />
          </>
        )}
      </main>
      {error && (
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "#e74c3c", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>{error}</div>
      )}
    </div>
  );
};


