import React, { useEffect, useState, useCallback } from "react";
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

// SDP validation function
const validateSDP = (sdp: string, type: 'offer' | 'answer'): boolean => {
  try {
    // Basic SDP format validation
    if (!sdp || typeof sdp !== 'string') {
      console.error("[webrtc] Invalid SDP: not a string");
      return false;
    }
    
    // Check for required SDP headers
    const requiredHeaders = ['v=', 'o=', 's=', 't='];
    for (const header of requiredHeaders) {
      if (!sdp.includes(header)) {
        console.error(`[webrtc] Invalid SDP: missing required header ${header}`);
        return false;
      }
    }
    
    // Type-specific validation
    if (type === 'offer') {
      // Offers should have m= lines for media
      if (!sdp.includes('m=')) {
        console.error("[webrtc] Invalid offer SDP: missing media lines");
        return false;
      }
    } else if (type === 'answer') {
      // Answers should have m= lines and a= lines
      if (!sdp.includes('m=') || !sdp.includes('a=')) {
        console.error("[webrtc] Invalid answer SDP: missing media or attribute lines");
        return false;
      }
    }
    
    console.log(`[webrtc] SDP validation passed for ${type}`);
    return true;
  } catch (error) {
    console.error("[webrtc] SDP validation error:", error);
    return false;
  }
};

// ICE restart function for connection recovery
const attemptIceRestart = async (peerConnection: RTCPeerConnection) => {
  try {
    console.log("[webrtc] Starting ICE restart...");
    
    // Create a new offer to restart ICE
    const offer = await peerConnection.createOffer({ iceRestart: true });
    await peerConnection.setLocalDescription(offer);
    
    // The offer will be sent via signaling automatically
    console.log("[webrtc] ICE restart offer created and set as local description");
  } catch (error) {
    console.error("[webrtc] ICE restart failed:", error);
  }
};

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
  const [showSpeedTooltip, setShowSpeedTooltip] = useState(false);
  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const [connectionError, setConnectionError] = useState<{
    message: string;
    recoverable: boolean;
    action?: string;
  } | null>(null);

  useEffect(() => {
    document.title = `Call • ${callId ?? "Unknown"}`;
  }, [callId]);

  // initialize PC and bind signaling after prejoin selection
  useEffect(() => {
    (async () => {
      if (!prejoinDone || !pendingInit) return;
      
      console.log("[video-call] Starting call initialization...");
      
        try {
          console.log("[webrtc] Starting peer connection initialization...");
          
          // 1. FIRST: Initialize peer connection
          await pc.init(); // Initialize peer connection without media
          console.log("[webrtc] Peer connection initialization completed");
          
          // 2. SECOND: Add local stream with selected devices
          console.log("[webrtc] Adding local stream with devices:", pendingInit);
          await pc.addLocalStream(pendingInit);
          console.log("[webrtc] Local stream added successfully");
          
          console.log("[webrtc] PC ref after init:", !!pc.pcRef.current);
          console.log("[webrtc] PC ref current value:", pc.pcRef.current);
          console.log("[webrtc] PC ref type:", typeof pc.pcRef.current);

          // 3. THIRD: Set up peer connection event handlers
          const peerConnection = pc.pcRef.current;
          if (peerConnection) {
            // Outbound ICE candidates
            peerConnection.onicecandidate = (e) => {
              if (e.candidate) {
                console.log("[webrtc] local ice-candidate", e.candidate.type, e.candidate.protocol);
                signaling.sendSignal({ type: "ice-candidate", candidate: e.candidate.toJSON() });
              } else {
                console.log("[webrtc] ICE gathering complete");
              }
            };
            
            // Monitor ICE connection state changes with recovery mechanism
            peerConnection.oniceconnectionstatechange = () => {
              console.log("[webrtc] ICE connection state changed:", peerConnection.iceConnectionState);
              if (peerConnection.iceConnectionState === "connected" || peerConnection.iceConnectionState === "completed") {
                console.log("[webrtc] ICE connection established successfully!");
                setError(null);
                setConnectionError(null); // Clear any previous errors
              } else if (peerConnection.iceConnectionState === "failed") {
                console.error("[webrtc] ICE connection failed - attempting recovery");
                setConnectionError({
                  message: "Connection failed. Attempting to reconnect...",
                  recoverable: true,
                  action: "Retry Connection"
                });
                // Attempt ICE restart after a delay
                setTimeout(() => {
                  if (peerConnection.iceConnectionState === "failed") {
                    console.log("[webrtc] Attempting ICE restart...");
                    attemptIceRestart(peerConnection);
                  }
                }, 5000);
              } else if (peerConnection.iceConnectionState === "disconnected") {
                console.log("[webrtc] ICE connection disconnected - waiting for auto-recovery");
                setConnectionError({
                  message: "Connection lost. Attempting to reconnect...",
                  recoverable: true,
                  action: "Retry Connection"
                });
                // Wait for automatic recovery, then attempt ICE restart if needed
                setTimeout(() => {
                  if (peerConnection.iceConnectionState === "disconnected") {
                    console.log("[webrtc] Auto-recovery failed, attempting ICE restart...");
                    attemptIceRestart(peerConnection);
                  }
                }, 10000);
              } else if (peerConnection.iceConnectionState === "checking") {
                console.log("[webrtc] ICE connection checking - establishing connection...");
                setError(null);
                setConnectionError(null);
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

          // 4. FOURTH: Set up signaling handlers (AFTER peer connection exists)
          console.log("[webrtc] Setting up signaling handlers...");
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
                
                // Validate SDP before processing
                if (!data.sdp || !validateSDP(data.sdp, "offer")) {
                  console.error("[webrtc] Invalid offer SDP, ignoring");
                  return;
                }
                
                await peerConnection.setRemoteDescription({ type: "offer", sdp: data.sdp });
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                console.log("[webrtc] Created answer, sending back");
                signaling.sendSignal({ type: "answer", sdp: answer.sdp });
              } else if (data.type === "answer") {
                console.log("[webrtc] Processing remote answer");
                
                // Validate SDP before processing
                if (!data.sdp || !validateSDP(data.sdp, "answer")) {
                  console.error("[webrtc] Invalid answer SDP, ignoring");
                  return;
                }
                
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

          // 5. FIFTH: Join the room
          const role = user?.role === "tutor" || user?.role === "student" ? (user.role as any) : "guest";
          console.log("[video-call] Joining room with role:", role);
          console.log("[video-call] Signaling connected:", signaling.connected);
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
                  if (videoSocket) {
                    console.log("[video-call] Sending initiate_call via centralized socket");
                    videoSocket.emit("initiate_call", { callId, targetUserId });
                    console.log("[video-call] Call notification sent successfully");
                  } else {
                    console.error("[video-call] Video socket not available");
                  }
                }
              } catch (error) {
                console.error("[video-call] Failed to send call notification:", error);
              }
            }
            
            // 6. SIXTH: Create offer if this is the initiator (AFTER everything is set up)
            if (initiator) {
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
      
      // Start heartbeat to let main window know popup is alive
      const heartbeatKey = `call-heartbeat-${callId}`;
      const heartbeatInterval = setInterval(() => {
        localStorage.setItem(heartbeatKey, Date.now().toString());
      }, 1000); // Send heartbeat every second
      
      // Fallback: Clear call ID after 5 minutes to prevent stuck states
      const fallbackTimeout = setTimeout(() => {
        console.log("[video-call] Fallback timeout - clearing call ID");
        clearActiveCallId();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => {
        clearInterval(heartbeatInterval);
        clearTimeout(fallbackTimeout);
        localStorage.removeItem(heartbeatKey);
        console.log("[video-call] Component unmounting - clearing call ID");
        clearActiveCallId();
      };
    }
    
    return () => {
      console.log("[video-call] Component unmounting - clearing call ID");
      clearActiveCallId();
    };
  }, [callId, setActiveCallId, clearActiveCallId]);

  // Handle peer left event
  useEffect(() => {
    signaling.onPeerLeft((payload) => {
      console.log("[video-call] Peer left:", payload);
      setRemotePeerJoined(false);
      setShowDisconnectMessage(true);
      
      // Clear heartbeat and call ID when peer leaves
      const heartbeatKey = `call-heartbeat-${callId}`;
      localStorage.removeItem(heartbeatKey);
      clearActiveCallId();
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    });
  }, [signaling, callId, clearActiveCallId]);

  // Handle peer disconnect events
  useEffect(() => {
    const handlePeerDisconnected = (event: CustomEvent) => {
      console.log("[video-call] Peer disconnected:", event.detail);
      
      // Only show disconnect message for permanent disconnections
      if (event.detail?.reason === 'ice-disconnected-permanent') {
        setShowDisconnectMessage(true);
        
        // Clear heartbeat and call ID when peer disconnects
        const heartbeatKey = `call-heartbeat-${callId}`;
        localStorage.removeItem(heartbeatKey);
        clearActiveCallId();
        
        // Auto-close after 3 seconds (increased from 2)
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        console.log("[video-call] Temporary disconnect detected - not closing call");
      }
    };

    window.addEventListener('peer-disconnected', handlePeerDisconnected as EventListener);
    
    return () => {
      window.removeEventListener('peer-disconnected', handlePeerDisconnected as EventListener);
    };
  }, [callId, clearActiveCallId]);

  // Handle browser close - emit peer_left signal and clear call ID
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("[video-call] Browser closing - emitting peer_left and clearing call ID");
      signaling.emitPeerLeft();
      clearActiveCallId(); // Clear the call ID when window closes
    };

    const handleVisibilityChange = () => {
      // Don't clear callId when document becomes hidden (tab switch, minimize)
      // Video calls should continue running in background
      if (document.hidden) {
        console.log("[video-call] Window hidden - keeping call active");
      }
    };

    const handlePageHide = () => {
      // Page hide can occur during navigation or tab switching
      // Only clear call ID if this is actually the window closing
      console.log("[video-call] Page hide detected - keeping call active unless window is closing");
      // Don't clear callId here - let beforeunload handle actual window close
    };

    // Multiple event listeners to catch different ways the popup can be closed
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [signaling, clearActiveCallId]);

  // Manual retry function for connection recovery
  const handleRetryConnection = useCallback(() => {
    if (pc.pcRef.current) {
      console.log("[video-call] Manual retry connection requested");
      attemptIceRestart(pc.pcRef.current);
      setConnectionError(null);
    }
  }, [pc.pcRef]);

  // Removed aggressive focus detection - video calls should run in background
  // Only cleanup on actual window close (beforeunload event)

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
              
              // Proceed with joining the call
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
            {/* User-friendly connection status with speed tooltip */}
            <div 
              style={{ 
                position: "absolute", 
                left: 16, 
                bottom: 16, 
                backdropFilter: "blur(6px)", 
                background: "rgba(255,255,255,0.08)", 
                padding: "8px 12px", 
                borderRadius: 8, 
                fontSize: 12,
                cursor: "pointer"
              }}
              onMouseEnter={() => setShowSpeedTooltip(true)}
              onMouseLeave={() => setShowSpeedTooltip(false)}
            >
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
              
              {/* Speed tooltip */}
              {showSpeedTooltip && (
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0, 0, 0, 0.9)",
                  color: "white",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  marginBottom: "8px",
                  zIndex: 1000
                }}>
                  ↓ {pc.speedMetrics.downloadMbps.toFixed(1)} Mbps / ↑ {pc.speedMetrics.uploadMbps.toFixed(1)} Mbps
                </div>
              )}
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
      
      {/* Connection Error with Recovery Option */}
      {connectionError && (
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: connectionError.recoverable ? "#f59e0b" : "#e74c3c",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          maxWidth: "400px",
          zIndex: 1000
        }}>
          <div style={{ flex: 1 }}>
            {connectionError.message}
          </div>
          {connectionError.recoverable && connectionError.action && (
            <button
              onClick={handleRetryConnection}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              {connectionError.action}
            </button>
          )}
        </div>
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
      
      {/* Disconnect message overlay */}
      {showDisconnectMessage && (
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
          zIndex: 1000
        }}>
          <div style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
            User has disconnected
          </div>
          <div style={{ fontSize: "14px", opacity: 0.7 }}>
            Closing call window...
          </div>
        </div>
      )}
    </div>
  );
};


