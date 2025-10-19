import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { VideoCallPanel } from "../../components/video-call/VideoCallPanel";
import { CallControls } from "../../components/video-call/CallControls";
import { PreJoinPanel } from "../../components/video-call/PreJoinPanel";
import { LeaveConfirmationModal } from "../../components/video-call/LeaveConfirmationModal";
import "../../components/video-call/call.css";
import { usePeerConnection } from "../../hooks/webrtc/usePeerConnection";
import { useVideoSignaling } from "../../hooks/webrtc/useVideoSignaling";
import { useAuthStore } from "../../store/authStore";
import { useCallStore } from "../../store/callStore";
import { SocketManager } from "../../services/socketManager";

export const VideoCallPage: React.FC = () => {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuthStore();
  const { setActiveCallId, clearActiveCallId } = useCallStore();
  const pc = usePeerConnection();
  const signaling = useVideoSignaling(callId, token || undefined);
  const [error, setError] = useState<string | null>(null);
  const [prejoinDone, setPrejoinDone] = useState(false);
  const [pendingInit, setPendingInit] = useState<{ audioDeviceId?: string; videoDeviceId?: string } | null>(null);
  const [remotePeerJoined, setRemotePeerJoined] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  useEffect(() => {
    document.title = `Call • ${callId ?? "Unknown"}`;
  }, [callId]);

  // initialize PC and bind signaling after prejoin selection
  useEffect(() => {
    (async () => {
      if (!prejoinDone || !pendingInit) return;
        try {
          console.log("[webrtc] Starting peer connection initialization...");
          await pc.init(); // Initialize peer connection without media
          console.log("[webrtc] Peer connection initialization completed");
          
          // Add local stream with selected devices
          console.log("[webrtc] Adding local stream with devices:", pendingInit);
          await pc.addLocalStream(pendingInit);
          console.log("[webrtc] Local stream added successfully");
          
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
                } else {
                  console.log("[webrtc] ICE gathering complete");
                }
              };
              
              // Monitor ICE connection state changes
              peerConnection.oniceconnectionstatechange = () => {
                console.log("[webrtc] ICE connection state changed:", peerConnection.iceConnectionState);
                if (peerConnection.iceConnectionState === "connected" || peerConnection.iceConnectionState === "completed") {
                  console.log("[webrtc] ICE connection established successfully!");
                } else if (peerConnection.iceConnectionState === "failed") {
                  console.error("[webrtc] ICE connection failed");
                  setError("Connection failed - please try again");
                }
              };
              
              // Monitor ICE gathering state
              peerConnection.onicegatheringstatechange = () => {
                console.log("[webrtc] ICE gathering state changed:", peerConnection.iceGatheringState);
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
                  
                  // Wait for ICE gathering to complete before creating offer
                  if (peerConnection.iceGatheringState === "gathering") {
                    console.log("[webrtc] Waiting for ICE gathering to complete...");
                    await new Promise((resolve) => {
                      const checkGathering = () => {
                        if (peerConnection.iceGatheringState === "complete") {
                          resolve(void 0);
                        } else {
                          setTimeout(checkGathering, 100);
                        }
                      };
                      checkGathering();
                    });
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

  // Monitor remote stream to update remotePeerJoined state
  useEffect(() => {
    if (pc.remoteStream) {
      setRemotePeerJoined(true);
    }
  }, [pc.remoteStream]);

  // Set active call ID when component mounts
  useEffect(() => {
    if (callId) {
      setActiveCallId(callId);
    }
    
    // Clear active call ID when component unmounts
    return () => {
      clearActiveCallId();
    };
  }, [callId, setActiveCallId, clearActiveCallId]);

  // Placeholder shell; hooks/components will be wired next
  return (
    <div className="cl-call-root">
      <header className="cl-call-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          <span>CampusLearn</span>
        </div>
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
            <VideoCallPanel 
              localStream={pc.localStream} 
              remoteStream={pc.remoteStream} 
              remotePeerJoined={remotePeerJoined}
              localVideoEnabled={pc.videoEnabled}
            />
            {/* User-friendly connection status */}
            <div style={{ position: "absolute", left: 16, bottom: 16, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: pc.connectionQuality.status === 'excellent' ? '#10b981' : 
                                 pc.connectionQuality.status === 'good' ? '#3b82f6' :
                                 pc.connectionQuality.status === 'fair' ? '#f59e0b' : '#ef4444'
                }} />
                <span style={{ fontWeight: 500, color: 'white' }}>
                  {pc.isReconnecting ? 'Reconnecting...' : 
                   pc.connectionQuality.status === 'excellent' ? 'Excellent' :
                   pc.connectionQuality.status === 'good' ? 'Good' :
                   pc.connectionQuality.status === 'fair' ? 'Fair' : 'Poor'} Connection
                </span>
              </div>
            </div>
            <CallControls
              onToggleMic={() => pc.toggleMic()}
              onToggleCam={() => pc.toggleCam()}
              onToggleScreenshare={() => pc.toggleScreenShare()}
              onLeave={() => setShowLeaveConfirmation(true)}
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
      
      <LeaveConfirmationModal
        isOpen={showLeaveConfirmation}
        onClose={() => setShowLeaveConfirmation(false)}
        onConfirm={() => {
          setShowLeaveConfirmation(false);
          clearActiveCallId();
          window.close();
        }}
      />
    </div>
  );
};


