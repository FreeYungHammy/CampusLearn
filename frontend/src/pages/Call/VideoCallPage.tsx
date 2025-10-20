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
const attemptIceRestart = async (peerConnection: RTCPeerConnection, signaling: any) => {
  try {
    console.log("[webrtc] Starting ICE restart...");
    
    // Create a new offer to restart ICE
    const offer = await peerConnection.createOffer({ iceRestart: true });
    await peerConnection.setLocalDescription(offer);
    
    // CRITICAL: Send the ICE restart offer via signaling
    console.log("[webrtc] Sending ICE restart offer via signaling...");
    signaling.sendSignal({ type: "offer", sdp: offer.sdp });
    console.log("[webrtc] ICE restart offer sent successfully");
  } catch (error) {
    console.error("[webrtc] ICE restart failed:", error);
  }
};

// Call state machine
type CallState = 'idle' | 'initializing' | 'connecting' | 'connected' | 'disconnecting' | 'failed';

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

  // Perfect Negotiation state
  const [isInitiator, setIsInitiator] = useState<boolean | null>(null);
  const [makingOffer, setMakingOffer] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');

  // State transition function
  const transitionToState = useCallback((newState: CallState, reason?: string) => {
    console.log(`[state-machine] Transition: ${callState} → ${newState}${reason ? ` (${reason})` : ''}`);
    setCallState(newState);
    
    // State-specific actions
    switch (newState) {
      case 'connected':
        setConnectionError(null);
        setError(null);
        break;
      case 'failed':
        setConnectionError({
          message: "Call failed. Please try again.",
          recoverable: true,
          action: "Retry"
        });
        break;
      case 'disconnecting':
        setConnectionError({
          message: "Disconnecting...",
          recoverable: false
        });
        break;
    }
  }, [callState]);

  // Perfect Negotiation: Ignore offer function (moved to top level)
  const ignoreOffer = useCallback((offer: RTCSessionDescriptionInit): boolean => {
    const peerConnection = pc.pcRef.current;
    if (!peerConnection) return true;
    
    // Always ignore offers if we're making an offer (prevent glare)
    if (makingOffer) {
      console.log("[perfect-negotiation] Ignoring offer - we're making an offer");
      return true;
    }
    
    // Check for glare condition
    const currentState = peerConnection.signalingState;
    if (currentState === "have-local-offer") {
      console.log("[perfect-negotiation] Glare detected - checking who's polite");
      
      // Determine polite peer based on user ID comparison
      // The peer with the lexicographically smaller ID is polite
      if (callId && user?.id) {
        const parts = callId.split(":").sort();
        const isPolite = user.id === parts[0]; // Smaller ID is polite
        
        console.log("[perfect-negotiation] Glare resolution:", { 
          userId: user.id, 
          isPolite, 
          sortedIds: parts 
        });
        
        if (isPolite) {
          console.log("[perfect-negotiation] Polite peer - rolling back local offer");
          return false; // Accept the remote offer (we'll rollback)
        } else {
          console.log("[perfect-negotiation] Impolite peer - ignoring remote offer");
          return true; // Ignore the remote offer
        }
      }
    }
    
    return false; // Accept the offer
  }, [makingOffer, callId, user?.id, pc.pcRef]);

  useEffect(() => {
    document.title = `Call • ${callId ?? "Unknown"}`;
  }, [callId]);

  // initialize PC and bind signaling after prejoin selection
  useEffect(() => {
    (async () => {
      if (!prejoinDone || !pendingInit) return;
      
      console.log("[video-call] Starting call initialization...");
      transitionToState('initializing', 'Starting call initialization');
      
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
            
            // Monitor ICE connection state changes with state machine integration
            peerConnection.oniceconnectionstatechange = () => {
              console.log("[webrtc] ICE connection state changed:", peerConnection.iceConnectionState);
              
              switch (peerConnection.iceConnectionState) {
                case "connected":
                case "completed":
                  console.log("[webrtc] ICE connection established successfully!");
                  transitionToState('connected', 'ICE connection established');
                  break;
                  
                case "failed":
                  console.error("[webrtc] ICE connection failed - attempting recovery");
                  transitionToState('connecting', 'ICE failed - attempting recovery');
                  setConnectionError({
                    message: "Connection failed. Attempting to reconnect...",
                    recoverable: true,
                    action: "Retry Connection"
                  });
                  // Attempt ICE restart after a delay
                  setTimeout(() => {
                    if (peerConnection.iceConnectionState === "failed") {
                      console.log("[webrtc] Attempting ICE restart...");
                      attemptIceRestart(peerConnection, signaling);
                    }
                  }, 5000);
                  break;
                  
                case "disconnected":
                  console.log("[webrtc] ICE connection disconnected - waiting for auto-recovery");
                  transitionToState('connecting', 'ICE disconnected - waiting for recovery');
                  setConnectionError({
                    message: "Connection lost. Attempting to reconnect...",
                    recoverable: true,
                    action: "Retry Connection"
                  });
                  // Wait for automatic recovery, then attempt ICE restart if needed
                  setTimeout(() => {
                    if (peerConnection.iceConnectionState === "disconnected") {
                      console.log("[webrtc] Auto-recovery failed, attempting ICE restart...");
                      attemptIceRestart(peerConnection, signaling);
                    }
                  }, 10000);
                  break;
                  
                case "checking":
                  console.log("[webrtc] ICE connection checking - establishing connection...");
                  transitionToState('connecting', 'ICE connection checking');
                  break;
                  
                case "new":
                  console.log("[webrtc] ICE connection new - initializing");
                  transitionToState('initializing', 'ICE connection new');
                  break;
                  
                default:
                  console.log("[webrtc] ICE connection state:", peerConnection.iceConnectionState);
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

          // 4. FOURTH: Set up Perfect Negotiation signaling handlers (AFTER peer connection exists)
          console.log("[perfect-negotiation] Setting up signaling handlers...");
          
          signaling.onSignal(async ({ data }) => {
            console.log("[perfect-negotiation] Received signal:", data?.type);
            if (!data?.type) return;
            
            try {
              const peerConnection = pc.pcRef.current;
              if (!peerConnection) {
                console.error("[perfect-negotiation] No peer connection available for signaling");
                return;
              }

              if (data.type === "offer") {
                console.log("[perfect-negotiation] Processing remote offer");
                
                // Validate SDP before processing
                if (!data.sdp || !validateSDP(data.sdp, "offer")) {
                  console.error("[perfect-negotiation] Invalid offer SDP, ignoring");
                  return;
                }
                
                const offer = { type: "offer" as const, sdp: data.sdp };
                
                // Check if we should ignore this offer (Perfect Negotiation glare handling)
                if (ignoreOffer(offer)) {
                  console.log("[perfect-negotiation] Ignoring offer due to glare condition");
                  return;
                }
                
                // Handle glare condition - rollback if we're the polite peer
                const currentState = peerConnection.signalingState;
                if (currentState === "have-local-offer") {
                  console.log("[perfect-negotiation] Rolling back local offer to accept remote offer");
                  await peerConnection.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
                }
                
                transitionToState('connecting', 'Processing remote offer');
                await peerConnection.setRemoteDescription(offer);
                
                setMakingOffer(true);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                setMakingOffer(false);
                
                console.log("[perfect-negotiation] Created answer, sending back");
                signaling.sendSignal({ type: "answer", sdp: answer.sdp });
                
              } else if (data.type === "answer") {
                console.log("[perfect-negotiation] Processing remote answer");
                
                // Validate SDP before processing
                if (!data.sdp || !validateSDP(data.sdp, "answer")) {
                  console.error("[perfect-negotiation] Invalid answer SDP, ignoring");
                  return;
                }
                
                const currentState = peerConnection.signalingState;
                console.log("[perfect-negotiation] Current signaling state:", currentState);
                
                if (currentState === "have-local-offer") {
                  await peerConnection.setRemoteDescription({ type: "answer", sdp: data.sdp });
                  console.log("[perfect-negotiation] Remote answer set successfully");
                  transitionToState('connected', 'Answer received');
                } else {
                  console.warn("[perfect-negotiation] Ignoring answer - wrong signaling state:", currentState);
                }
              } else if (data.type === "ice-candidate" && data.candidate) {
                console.log("[perfect-negotiation] Adding remote ICE candidate");
                try {
                  await peerConnection.addIceCandidate(data.candidate);
                } catch (error) {
                  console.warn("[perfect-negotiation] Failed to add ICE candidate:", error);
                  // Don't throw - this is often non-fatal
                }
              }
            } catch (error) {
              console.error("[perfect-negotiation] Error processing signal:", error);
              transitionToState('failed', 'Signaling error');
            }
          });

          // 5. FIFTH: Join the room
          const role = user?.role === "tutor" || user?.role === "student" ? (user.role as any) : "guest";
          console.log("[video-call] Joining room with role:", role);
          console.log("[video-call] Signaling connected:", signaling.connected);
          signaling.join(role);

            // Perfect Negotiation: Determine initiator based on user ID comparison
            // This ensures consistent role assignment without URL parameters
            if (callId && user?.id) {
              const parts = callId.split(":");
              if (parts.length === 2) {
                // Use lexicographic comparison to determine initiator
                // This ensures both peers arrive at the same conclusion
                const [id1, id2] = parts.sort();
                const initiator = user.id === id1;
                setIsInitiator(initiator);
                console.log("[perfect-negotiation] User role determined:", { 
                  userId: user.id, 
                  callId, 
                  isInitiator: initiator,
                  sortedIds: [id1, id2]
                });
                
                // Send call notification if this is the initiator
                if (initiator) {
                  try {
                    const targetUserId = id2;
                    console.log("[video-call] Sending call notification to:", targetUserId);
                    
                    const videoSocket = SocketManager.getVideoSocket();
                    if (videoSocket) {
                      console.log("[video-call] Sending initiate_call via centralized socket");
                      videoSocket.emit("initiate_call", { callId, targetUserId });
                      console.log("[video-call] Call notification sent successfully");
                    } else {
                      console.error("[video-call] Video socket not available");
                    }
                  } catch (error) {
                    console.error("[video-call] Failed to send call notification:", error);
                  }
                }
              }
            }
            
            // Perfect Negotiation: Start negotiation process
            // Both peers will attempt to create offers, but Perfect Negotiation handles conflicts
            setTimeout(async () => {
              if (isInitiator === true) {
                try {
                  console.log("[perfect-negotiation] Creating initial offer as initiator...");
                  transitionToState('connecting', 'Creating initial offer');
                  
                  const peerConnection = pc.pcRef.current;
                  if (!peerConnection) {
                    console.error("[webrtc] Peer connection not initialized");
                    transitionToState('failed', 'No peer connection');
                    return;
                  }
                  
                  // Check if we already have a local offer (prevent duplicate offers)
                  const currentState = peerConnection.signalingState;
                  if (currentState === "have-local-offer") {
                    console.log("[webrtc] Already have local offer, skipping");
                    return;
                  }
                  
                  // Safety check: Ensure we're not already making an offer
                  if (makingOffer) {
                    console.log("[perfect-negotiation] Already making offer, skipping");
                    return;
                  }
                  
                  setMakingOffer(true);
                  const offer = await peerConnection.createOffer();
                  await peerConnection.setLocalDescription(offer);
                  setMakingOffer(false);
                  
                  console.log("[perfect-negotiation] Initial offer created and sent");
                  signaling.sendSignal({ type: "offer", sdp: offer.sdp });
                } catch (e: any) {
                  console.error("[perfect-negotiation] Failed to create initial offer:", e);
                  setMakingOffer(false);
                  transitionToState('failed', 'Failed to create offer');
                  setError(`Failed to create offer: ${e.message}`);
                }
              }
            }, 1000); // Small delay to ensure both peers are ready
            
            // Fallback: If no offer is created within 5 seconds, try again (safety net)
            setTimeout(async () => {
              const peerConnection = pc.pcRef.current;
              if (peerConnection && isInitiator === true && !makingOffer) {
                const currentState = peerConnection.signalingState;
                if (currentState === "stable" || currentState === "have-remote-offer") {
                  console.log("[perfect-negotiation] Fallback: No initial offer detected, creating one...");
                  try {
                    setMakingOffer(true);
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    setMakingOffer(false);
                    signaling.sendSignal({ type: "offer", sdp: offer.sdp });
                    console.log("[perfect-negotiation] Fallback offer created and sent");
                  } catch (e: any) {
                    console.error("[perfect-negotiation] Fallback offer failed:", e);
                    setMakingOffer(false);
                  }
                }
              }
            }, 5000);
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
      
      // Fallback: Clear call ID after 30 minutes to prevent stuck states
      // This is much longer to avoid interfering with long calls
      const fallbackTimeout = setTimeout(() => {
        console.log("[video-call] Fallback timeout - clearing call ID after 30 minutes");
        clearActiveCallId();
      }, 30 * 60 * 1000); // 30 minutes
      
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
      
      // Clear heartbeat when peer leaves but DON'T clear callId
      // The user might want to rejoin or the peer might reconnect
      const heartbeatKey = `call-heartbeat-${callId}`;
      localStorage.removeItem(heartbeatKey);
      // Don't clear callId here - let user manually leave or rejoin
      
      // Auto-close after 2 seconds ONLY if this is a permanent leave
      // For temporary disconnections, the peer might rejoin
      setTimeout(() => {
        // Check if peer has rejoined before closing
        if (!remotePeerJoined) {
          console.log("[video-call] Peer hasn't rejoined after 2 seconds, closing window");
          window.close();
        } else {
          console.log("[video-call] Peer rejoined, keeping window open");
        }
      }, 2000);
    });
  }, [signaling, callId, remotePeerJoined]);

  // Handle peer disconnect events
  useEffect(() => {
    const handlePeerDisconnected = (event: CustomEvent) => {
      console.log("[video-call] Peer disconnected:", event.detail);
      
      // Only show disconnect message for permanent disconnections
      if (event.detail?.reason === 'ice-disconnected-permanent') {
        setShowDisconnectMessage(true);
        
        // Clear heartbeat when peer disconnects but DON'T clear callId
        // The peer might reconnect or the user might want to wait
        const heartbeatKey = `call-heartbeat-${callId}`;
        localStorage.removeItem(heartbeatKey);
        // Don't clear callId here - let user manually leave or wait for reconnection
        
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

  // Manual retry function for connection recovery with state machine
  const handleRetryConnection = useCallback(() => {
    if (pc.pcRef.current) {
      console.log("[video-call] Manual retry connection requested");
      transitionToState('connecting', 'Manual retry requested');
      attemptIceRestart(pc.pcRef.current, signaling);
      setConnectionError(null);
    }
  }, [pc.pcRef, signaling, transitionToState]);

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
            {/* User-friendly connection status with state machine and speed tooltip */}
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
                  backgroundColor: callState === 'connected' ? '#10b981' : 
                                 callState === 'connecting' ? '#3b82f6' :
                                 callState === 'initializing' ? '#8b5cf6' :
                                 callState === 'failed' ? '#ef4444' : '#6b7280'
                }} />
                <span style={{ fontWeight: 500, color: 'white' }}>
                  {callState === 'idle' ? 'Idle' :
                   callState === 'initializing' ? 'Initializing...' :
                   callState === 'connecting' ? 'Connecting...' :
                   callState === 'connected' ? (pc.connectionQuality.status === 'excellent' ? 'Excellent' :
                                                pc.connectionQuality.status === 'good' ? 'Good' :
                                                pc.connectionQuality.status === 'fair' ? 'Fair' : 'Poor') + ' Connection' :
                   callState === 'disconnecting' ? 'Disconnecting...' :
                   callState === 'failed' ? 'Connection Failed' : 'Unknown'}
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


