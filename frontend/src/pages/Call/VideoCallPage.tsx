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
type CallState = 'idle' | 'initializing' | 'connecting' | 'connected' | 'disconnecting' | 'failed' | 'waiting-for-peer';

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
  
  // Debug logging for modal state changes
  useEffect(() => {
    console.log("[video-call] 🔴 showLeaveConfirmation changed to:", showLeaveConfirmation);
  }, [showLeaveConfirmation]);
  const [showSpeedTooltip, setShowSpeedTooltip] = useState(false);
  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const [showCallEndedMessage, setShowCallEndedMessage] = useState(false);
  const [connectionError, setConnectionError] = useState<{
    message: string;
    recoverable: boolean;
    action?: string;
  } | null>(null);
  const [canResendInvite, setCanResendInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [connectionStable, setConnectionStable] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Perfect Negotiation state
  const [isInitiator, setIsInitiator] = useState<boolean | null>(null);
  const [makingOffer, setMakingOffer] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  const [waitingForReconnect, setWaitingForReconnect] = useState(false);

  // State transition function
  const transitionToState = useCallback((newState: CallState, reason?: string) => {
    console.log(`[state-machine] Transition: ${callState} → ${newState}${reason ? ` (${reason})` : ''}`);
    setCallState(newState);
    
    // State-specific actions
    switch (newState) {
      case 'connected':
        setConnectionError(null);
        setError(null);
        setPeerDisconnected(false);
        setWaitingForReconnect(false);
        // Only mark as stable if we have both local and remote streams
        // This ensures the connection is actually working, not just in 'connected' state
        break;
      case 'failed':
        setConnectionError({
          message: "Call failed. Please try again.",
          recoverable: true,
          action: "Retry"
        });
        setConnectionStable(false);
        break;
      case 'disconnecting':
        setConnectionError({
          message: "Disconnecting...",
          recoverable: false
        });
        setConnectionStable(false);
        break;
      case 'waiting-for-peer':
        setConnectionError({
          message: "Waiting for peer to reconnect...",
          recoverable: true,
          action: "Cancel Wait"
        });
        setPeerDisconnected(true);
        setWaitingForReconnect(true);
        setConnectionStable(false);
        break;
    }
  }, [callState, connectionTimeout]);

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

  // Connection timeout effect - close popup if connection doesn't establish
  useEffect(() => {
    if (!prejoinDone || !pendingInit) return;
    
    console.log("[video-call] Setting up connection timeout...");
    
    // Set a timeout to close the popup if connection doesn't establish within 30 seconds
    const timeout = setTimeout(() => {
      if (!connectionStable) {
        console.log("[video-call] Connection timeout - closing popup");
        setConnectionError({
          message: "Connection failed to establish. Closing call.",
          recoverable: false
        });
        
        // Clear call state and close popup
        clearActiveCallId();
        const { setCallInProgress } = useCallStore.getState();
        setCallInProgress(false);
        
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    }, 30000); // 30 second timeout
    
    setConnectionTimeout(timeout);
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [prejoinDone, pendingInit, clearActiveCallId]); // Removed connectionStable from dependencies to prevent re-running

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
                  
                  // Auto-close popup when connection fails
                  console.log("[video-call] Connection failed - auto-closing popup");
                  setTimeout(() => {
                    clearActiveCallId();
                    const { setCallInProgress } = useCallStore.getState();
                    setCallInProgress(false);
                    window.close();
                  }, 3000); // Close after 3 seconds
                  
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
                  
                  // Auto-close popup when connection is lost
                  console.log("[video-call] Connection lost - auto-closing popup");
                  setTimeout(() => {
                    clearActiveCallId();
                    const { setCallInProgress } = useCallStore.getState();
                    setCallInProgress(false);
                    window.close();
                  }, 3000); // Close after 3 seconds
                  
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
          
          // Set up peer joined handler early to catch events
          signaling.onPeerJoined(() => {
            console.log("[perfect-negotiation] Peer joined event received, starting negotiation...");
            if (isActualInitiator === true) {
              startNegotiation();
            }
          });
          
          signaling.onSignal(async ({ data }) => {
            console.log("[perfect-negotiation] 📨 Received signal:", data?.type);
            console.log("[perfect-negotiation] Signal data:", data);
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

          // Determine initiator based on URL parameter (actual call initiator)
          let isActualInitiator = false;
          if (callId && user?.id) {
            const urlParams = new URLSearchParams(window.location.search);
            const isInitiatorParam = urlParams.get('isInitiator');
            const initiatorId = urlParams.get('initiator');
            
            console.log("[DEBUG] URL Analysis:", {
              fullUrl: window.location.href,
              search: window.location.search,
              urlParams: Object.fromEntries(urlParams.entries()),
              userId: user.id,
              callId
            });
            
            // Determine if this user is the actual initiator
            isActualInitiator = isInitiatorParam === 'true' || initiatorId === user.id;
            setIsInitiator(isActualInitiator);
            
            console.log("[perfect-negotiation] User role determined:", { 
              userId: user.id, 
              callId, 
              isInitiator: isActualInitiator,
              isInitiatorParam,
              initiatorId,
              urlParams: Object.fromEntries(urlParams.entries())
            });
            
            // Notification will be sent from PreJoinPanel when user clicks "Join Call"
          }
            
            // Perfect Negotiation: Start negotiation process
            // Wait for peer to join before starting negotiation
            console.log("[perfect-negotiation] Waiting for peer to join before starting negotiation...");
            
            // Set up peer joined handler to start negotiation
            const startNegotiation = async () => {
              console.log("[perfect-negotiation] Peer joined! Starting negotiation...", { isInitiator: isActualInitiator, makingOffer });
              if (isActualInitiator === true) {
                try {
                  console.log("[perfect-negotiation] ✅ Creating initial offer as initiator...");
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
                  
                  console.log("[perfect-negotiation] ✅ Initial offer created and sent");
                  console.log("[perfect-negotiation] Offer SDP length:", offer.sdp?.length || 0);
                  signaling.sendSignal({ type: "offer", sdp: offer.sdp || "" });
                } catch (e: any) {
                  console.error("[perfect-negotiation] Failed to create initial offer:", e);
                  setMakingOffer(false);
                  transitionToState('failed', 'Failed to create offer');
                  setError(`Failed to create offer: ${e.message}`);
                }
              }
            };
            
            // Check if peer has already joined (in case we missed the event)
            if (remotePeerJoined) {
              console.log("[perfect-negotiation] Peer already joined, starting negotiation immediately...");
              startNegotiation();
            }
            
            // Fallback: If no offer is created within 5 seconds, try again (safety net)
            setTimeout(async () => {
              const peerConnection = pc.pcRef.current;
              if (peerConnection && isActualInitiator === true && !makingOffer) {
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
    // Don't call signaling.leave() here as it causes premature disconnection
    // The leave will be handled by the component unmount cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, prejoinDone, pendingInit]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("[video-call] Component unmounting, leaving call");
      console.log("[video-call] 🔴 Emitting peer_left event on unmount");
      
      // Clear connection timeout if it exists
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
      
      // Try to emit peer_left event to notify other participants before leaving
      try {
        signaling.emitPeerLeft();
        signaling.leave();
      } catch (error) {
        console.log("[video-call] Error during cleanup:", error);
      }
      
      // Reset global call state to re-enable video call button
      try {
        const { setCallInProgress } = useCallStore.getState();
        setCallInProgress(false);
        clearActiveCallId();
      } catch (error) {
        console.log("[video-call] Error resetting call state:", error);
      }
    };
  }, []); // Empty dependency array - this should only run on unmount

  // Monitor remote stream to update remotePeerJoined state
  useEffect(() => {
    if (pc.remoteStream) {
      setRemotePeerJoined(true);
      setShowDisconnectMessage(false);
      
      // If we were waiting for reconnect and peer rejoined, transition to connected
      if (waitingForReconnect && callState === 'waiting-for-peer') {
        console.log("[video-call] Peer rejoined, transitioning to connected state");
        transitionToState('connected', 'Peer rejoined');
      }
    }
  }, [pc.remoteStream, waitingForReconnect, callState, transitionToState]);

  // Monitor connection stability - only set stable when we have both streams and good connection
  useEffect(() => {
    const checkConnectionStability = () => {
      const hasLocalStream = !!pc.localStream;
      const hasRemoteStream = !!pc.remoteStream;
      const isConnected = callState === 'connected';
      const hasGoodConnection = pc.connectionQuality.status === 'excellent' || 
                               pc.connectionQuality.status === 'good' || 
                               pc.connectionQuality.status === 'fair';
      
      // Check ICE connection state for additional validation
      const peerConnection = pc.pcRef.current;
      const iceConnectionState = peerConnection?.iceConnectionState;
      const isIceConnected = iceConnectionState === 'connected' || iceConnectionState === 'completed';
      
      // Only set stable if we have both streams, are connected, have good connection quality, and ICE is connected
      const shouldBeStable = hasLocalStream && hasRemoteStream && isConnected && hasGoodConnection && isIceConnected;
      
      console.log("[video-call] Connection stability check:", {
        hasLocalStream,
        hasRemoteStream,
        isConnected,
        hasGoodConnection,
        isIceConnected,
        iceConnectionState,
        shouldBeStable,
        currentStable: connectionStable
      });
      
      if (shouldBeStable && !connectionStable) {
        console.log("[video-call] ✅ Connection is now stable");
        setConnectionStable(true);
        // Clear any existing timeout since connection is established
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      } else if (!shouldBeStable && connectionStable) {
        console.log("[video-call] ❌ Connection is no longer stable");
        setConnectionStable(false);
      }
    };

    // Check immediately
    checkConnectionStability();
    
    // Set up interval to check connection stability
    const stabilityInterval = setInterval(checkConnectionStability, 2000); // Check every 2 seconds
    
    return () => {
      clearInterval(stabilityInterval);
    };
  }, [pc.localStream, pc.remoteStream, pc.connectionQuality.status, callState, connectionStable, connectionTimeout]);

  // Auto-close popup when connection is lost
  useEffect(() => {
    if (connectionError?.message === "Connection lost. Attempting to reconnect...") {
      console.log("[video-call] Connection lost detected - auto-closing popup in 3 seconds");
      const closeTimeout = setTimeout(() => {
        clearActiveCallId();
        const { setCallInProgress } = useCallStore.getState();
        setCallInProgress(false);
        window.close();
      }, 3000);
      
      return () => clearTimeout(closeTimeout);
    }
  }, [connectionError, clearActiveCallId]);

  // Handle peer joined event
  useEffect(() => {
    signaling.onPeerJoined((payload) => {
      console.log("[video-call] Peer joined:", payload);
      setRemotePeerJoined(true);
      setShowDisconnectMessage(false);
      
      // If we were waiting for reconnect and peer rejoined, transition to connected
      if (waitingForReconnect && callState === 'waiting-for-peer') {
        console.log("[video-call] Peer rejoined via signaling, transitioning to connected state");
        transitionToState('connected', 'Peer rejoined via signaling');
      }
    });
  }, [signaling, waitingForReconnect, callState, transitionToState]);

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
      setWaitingForReconnect(true);
      
      // Clear heartbeat when peer leaves but DON'T clear callId
      // The user might want to rejoin or the peer might reconnect
      const heartbeatKey = `call-heartbeat-${callId}`;
      localStorage.removeItem(heartbeatKey);
      
      // Transition to waiting state instead of closing
      console.log("[video-call] Peer disconnected, entering waiting state");
      transitionToState('waiting-for-peer', 'Peer disconnected');
    });

    // Listen for call ended events (when someone explicitly ends the call)
    signaling.onCallEnded((payload) => {
      console.log("[video-call] 🔴 Call ended event received:", payload);
      console.log("[video-call] 🔴 Setting showCallEndedMessage to true");
      setRemotePeerJoined(false);
      setShowCallEndedMessage(true);
      setWaitingForReconnect(false);
      
      // Clear heartbeat and call ID since call is definitively ended
      const heartbeatKey = `call-heartbeat-${callId}`;
      localStorage.removeItem(heartbeatKey);
      clearActiveCallId();
      
      // Reset call in progress flag to re-enable video call button
      const { setCallInProgress } = useCallStore.getState();
      setCallInProgress(false);
      
      // Transition to failed state since call is over
      console.log("[video-call] 🔴 Call ended by other user - showing call ended message");
      transitionToState('failed', 'Call ended by other participant');
    });
  }, [signaling, callId, transitionToState]);

  // Handle reconnection timeout
  useEffect(() => {
    if (waitingForReconnect && !remotePeerJoined) {
      const reconnectTimeout = setTimeout(() => {
        console.log("[video-call] Peer hasn't rejoined after 30 seconds, refreshing page");
        // Force page refresh to ensure clean state
        window.location.reload();
      }, 30000);
      
      return () => clearTimeout(reconnectTimeout);
    }
  }, [waitingForReconnect, remotePeerJoined]);

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
      try {
        signaling.emitPeerLeft();
      } catch (error) {
        console.log("[video-call] Error emitting peer_left on close:", error);
      }
      clearActiveCallId(); // Clear the call ID when window closes
      // Give a small delay to ensure the event is sent before the page unloads
      return undefined; // Allow the page to unload normally
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

  // Ensure socket connection stability during call
  useEffect(() => {
    if (!callId || !user?.id) return;

    console.log("[video-call] Ensuring socket connection stability for call:", callId);
    
    // Check if socket is connected, if not, try to reconnect
    const checkSocketConnection = () => {
      const videoSocket = SocketManager.getVideoSocket();
      if (!videoSocket || !videoSocket.connected) {
        console.log("[video-call] Socket not connected, attempting to reconnect...");
        const wsUrl = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
        SocketManager.initialize({
          url: wsUrl,
          token: token || "",
        });
      }
    };

    // Check immediately
    checkSocketConnection();

    // Check every 10 seconds during the call
    const interval = setInterval(checkSocketConnection, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [callId, user?.id, token]);

  // Manual retry function for connection recovery with state machine
  const handleRetryConnection = useCallback(() => {
    if (pc.pcRef.current) {
      console.log("[video-call] Manual retry connection requested");
      transitionToState('connecting', 'Manual retry requested');
      attemptIceRestart(pc.pcRef.current, signaling);
      setConnectionError(null);
    }
  }, [pc.pcRef, signaling, transitionToState]);

  // Resend invite functionality - only the lexicographic initiator can resend (backend requirement)
  const handleResendInvite = useCallback(async () => {
    if (!callId || !user?.id) {
      console.log("[video-call] Cannot resend invite - missing callId or userId");
      return;
    }
    
    // Check if this user is the lexicographic initiator (same logic as backend validation)
    const parts = callId.split(":");
    if (parts.length !== 2) {
      console.log("[video-call] Invalid callId format");
      return;
    }
    
    const [id1, id2] = parts.sort();
    const isLexicographicInitiator = user.id === id1;
    
    if (!isLexicographicInitiator) {
      console.log("[video-call] Cannot resend invite - not lexicographic initiator", { 
        callId, 
        userId: user.id, 
        sortedIds: [id1, id2],
        isLexicographicInitiator 
      });
      return;
    }
    
    try {
      const targetUserId = parts.find(id => id !== user.id);
      
      if (targetUserId) {
        // Ensure socket is connected before sending
        let videoSocket = SocketManager.getVideoSocket();
        
        if (!videoSocket || !videoSocket.connected) {
          console.log("[video-call] Video socket not available, attempting to reconnect...");
          
          // Try to reinitialize the socket manager
          const wsUrl = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
          SocketManager.initialize({
            url: wsUrl,
            token: token || "",
          });
          
          // Wait a bit for connection
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          videoSocket = SocketManager.getVideoSocket();
        }
        
        if (videoSocket && videoSocket.connected) {
          console.log("[video-call] Resending invite to:", targetUserId);
          videoSocket.emit("initiate_call", { 
            callId, 
            targetUserId,
            fromUserName: `${user.name || "Unknown"} ${user.surname || "User"}` // Pass fromUserName
          });
          setCanResendInvite(false);
          setInviteSent(true);
          
          // Re-enable resend after 10 seconds
          setTimeout(() => setCanResendInvite(true), 10000);
          
          console.log("[video-call] Invite resent successfully");
        } else {
          console.error("[video-call] Video socket still not available after reconnection attempt");
          setConnectionError({
            message: "Unable to send invite. Please check your connection and try again.",
            recoverable: true,
            action: "Retry"
          });
        }
      }
    } catch (error) {
      console.error("[video-call] Failed to resend invite:", error);
      setConnectionError({
        message: "Failed to resend invite. Please try again.",
        recoverable: true,
        action: "Retry"
      });
    }
  }, [callId, user?.id, token]);

  const handleCancelWait = useCallback(() => {
    console.log("[video-call] Canceling wait for peer reconnection");
    clearActiveCallId();
    window.close();
  }, [clearActiveCallId]);

  const handleCallStateChange = useCallback((isInCall: boolean) => {
    console.log("[video-call] Call state changed:", isInCall);
    const { setCallInProgress } = useCallStore.getState();
    setCallInProgress(isInCall);
  }, []);

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
        {inviteSent && canResendInvite && !remotePeerJoined && (() => {
          if (!callId || !user?.id) return false;
          const parts = callId.split(":");
          if (parts.length !== 2) return false;
          const [id1, id2] = parts.sort();
          return user.id === id1; // Only show for lexicographic initiator
        })() && (
          <button
            onClick={handleResendInvite}
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#3b82f6",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Resend Invite
          </button>
        )}
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
            onCallStateChange={handleCallStateChange}
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
                                 callState === 'waiting-for-peer' ? '#f59e0b' :
                                 callState === 'failed' ? '#ef4444' : '#6b7280'
                }} />
                <span style={{ fontWeight: 500, color: 'white' }}>
                  {callState === 'idle' ? 'Idle' :
                   callState === 'initializing' ? 'Initializing...' :
                   callState === 'connecting' ? 'Connecting...' :
                   callState === 'connected' ? (pc.connectionQuality.status === 'excellent' ? 'Excellent' :
                                                pc.connectionQuality.status === 'good' ? 'Good' :
                                                pc.connectionQuality.status === 'fair' ? 'Fair' : 
                                                pc.connectionQuality.status === 'poor' ? 'Poor' : 
                                                pc.connectionQuality.status === 'unknown' ? 'Connected' : 'Connected') + ' Connection' :
                   callState === 'disconnecting' ? 'Disconnecting...' :
                   callState === 'failed' ? 'Connection Failed' :
                   callState === 'waiting-for-peer' ? 'Waiting for Peer...' : 'Unknown'}
                </span>
                {connectionStable && (
                  <span style={{ 
                    fontSize: 10, 
                    color: '#10b981', 
                    fontWeight: 600,
                    marginLeft: 4
                  }}>
                    ✓ Stable
                  </span>
                )}
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
              onLeave={() => {
                console.log("[video-call] 🔴 Leave Call button clicked!");
                setShowLeaveConfirmation(true);
              }}
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
      
      {/* Connection Timeout Warning */}
      {!connectionStable && callState !== 'connected' && callState !== 'idle' && (
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(245, 158, 11, 0.9)",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          maxWidth: "400px",
          zIndex: 1000,
          backdropFilter: "blur(6px)"
        }}>
          <div style={{ flex: 1 }}>
            {callState === 'initializing' ? 'Establishing connection...' :
             callState === 'connecting' ? 'Connecting to peer...' :
             'Connection in progress...'}
          </div>
          <button
            onClick={() => {
              clearActiveCallId();
              const { setCallInProgress } = useCallStore.getState();
              setCallInProgress(false);
              window.close();
            }}
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
            Cancel
          </button>
        </div>
      )}

      {/* Connection Error with Recovery Option */}
      {connectionError && (
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: callState === 'waiting-for-peer' ? "#f59e0b" : (connectionError.recoverable ? "#f59e0b" : "#e74c3c"),
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
              onClick={callState === 'waiting-for-peer' ? handleCancelWait : 
                      connectionError.action === 'Retry' ? handleResendInvite : handleRetryConnection}
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
          {/* Always show close button for non-recoverable errors */}
          {!connectionError.recoverable && (
            <button
              onClick={() => {
                clearActiveCallId();
                const { setCallInProgress } = useCallStore.getState();
                setCallInProgress(false);
                window.close();
              }}
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
              Close
            </button>
          )}
        </div>
      )}
      
      <LeaveConfirmationModal
        isOpen={showLeaveConfirmation}
        onClose={() => {
          console.log("[video-call] 🔴 Leave confirmation modal closed");
          setShowLeaveConfirmation(false);
        }}
        onConfirm={() => {
          console.log("[video-call] User confirmed leave call - emitting peer_left event");
          console.log("[video-call] Current callId:", callId);
          console.log("[video-call] Signaling connected:", signaling.connected);
          console.log("[video-call] Signaling object:", signaling);
          
          // Emit peer_left event to notify other participants
          console.log("[video-call] About to call signaling.emitPeerLeft()");
          try {
            signaling.emitPeerLeft();
            console.log("[video-call] Called signaling.emitPeerLeft()");
          } catch (error) {
            console.log("[video-call] Error emitting peer_left:", error);
          }
          
          // Also emit leave_call to ensure proper cleanup
          console.log("[video-call] Emitting leave_call for proper cleanup");
          try {
            signaling.leave();
          } catch (error) {
            console.log("[video-call] Error calling leave:", error);
          }
          
          // Increased delay to ensure the event is sent and processed before closing
          setTimeout(() => {
            setShowLeaveConfirmation(false);
            clearActiveCallId();
            // Reset call in progress flag to re-enable video call button
            const { setCallInProgress } = useCallStore.getState();
            setCallInProgress(false);
            console.log("[video-call] Call state reset, closing popup");
            // Close the popup window instead of refreshing
            window.close();
          }, 1000); // Increased from 100ms to 1000ms to ensure proper event delivery
        }}
      />
      
      {/* Call ended message overlay */}
      {showCallEndedMessage && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.9)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          zIndex: 1000
        }}>
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)", 
            padding: "24px", 
            borderRadius: "12px", 
            textAlign: "center",
            maxWidth: "400px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
              📞 Call ended
            </div>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "20px" }}>
              The other participant has ended the call.
            </div>
            <button
              onClick={() => {
                setShowCallEndedMessage(false);
                clearActiveCallId();
                // Reset call in progress flag to re-enable video call button
                const { setCallInProgress } = useCallStore.getState();
                setCallInProgress(false);
                // Close the popup window
                window.close();
              }}
              style={{
                background: "#3b82f6",
                border: "none",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Disconnect message overlay */}
      {showDisconnectMessage && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.9)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          zIndex: 1000
        }}>
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)", 
            padding: "24px", 
            borderRadius: "12px", 
            textAlign: "center",
            maxWidth: "400px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
              👋 Other user disconnected
            </div>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "20px" }}>
              The other participant has left the call. You can wait for them to rejoin or end the call.
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setShowDisconnectMessage(false);
                  setRemotePeerJoined(false);
                  setWaitingForReconnect(true);
                  // Keep the call active in case they want to rejoin
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Wait for reconnection
              </button>
              <button
                onClick={() => {
                  setShowDisconnectMessage(false);
                  clearActiveCallId();
                  // Force page refresh to ensure clean state
                  window.location.reload();
                }}
                style={{
                  background: "#ef4444",
                  border: "none",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                End call
              </button>
            </div>
            <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "12px" }}>
              The call will automatically close if no one rejoins within 30 seconds
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


