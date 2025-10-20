import React, { useEffect, useRef, useState } from "react";
import { useDevices } from "../../hooks/webrtc/useDevices";
import { useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { SocketManager } from "../../services/socketManager";

type Props = {
  onConfirm: (sel: { audioDeviceId?: string; videoDeviceId?: string }) => void;
  onCancel: () => void;
  onCallStateChange?: (isInCall: boolean) => void;
};

export const PreJoinPanel: React.FC<Props> = ({ onConfirm, onCancel, onCallStateChange }) => {
  const { callId } = useParams();
  const { user, token } = useAuthStore();
  const { cameras, mics, isLoading: devicesLoading, error: devicesError, refreshDevices } = useDevices();
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [deviceRetryCount, setDeviceRetryCount] = useState(0);
  const [showDeviceRetry, setShowDeviceRetry] = useState(false);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Device retry mechanism
  const handleDeviceRetry = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
    
    setShowDeviceRetry(true);
    setDeviceRetryCount(prev => prev + 1);
    setRetryCountdown(5);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Wait 5 seconds then allow device re-selection
    const timeout = setTimeout(() => {
      setShowDeviceRetry(false);
      setError(null);
      setRetryCountdown(0);
      // Refresh devices to get updated list
      refreshDevices();
    }, 5000);
    
    setRetryTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  // Send call notification if user is the initiator
  const sendCallNotification = async () => {
    if (!callId || !user?.id || !token) return;
    
    try {
      setIsSendingNotification(true);
      
      // Determine if this user is the actual initiator from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const isInitiatorParam = urlParams.get('isInitiator');
      const initiatorId = urlParams.get('initiator');
      
      const isActualInitiator = isInitiatorParam === 'true' || initiatorId === user.id;
      
      if (!isActualInitiator) {
        console.log("[PreJoinPanel] Not the actual initiator, skipping notification");
        return;
      }
      
      // Get the target user ID (the other user in the call)
      const parts = callId.split(":");
      if (parts.length !== 2) {
        console.error("[PreJoinPanel] Invalid callId format");
        return;
      }
      
      const targetUserId = parts.find(id => id !== user.id);
      if (!targetUserId) {
        console.error("[PreJoinPanel] Could not determine target user ID");
        return;
      }
      
      console.log("[PreJoinPanel] Sending call notification to:", targetUserId);
      
      // Get video socket from SocketManager
      let videoSocket = SocketManager.getVideoSocket();
      
      // Ensure socket is connected
      if (!videoSocket || !videoSocket.connected) {
        console.log("[PreJoinPanel] Video socket not available, attempting to reconnect...");
        const wsUrl = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
        SocketManager.initialize({
          url: wsUrl,
          token: token,
        });
        
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        videoSocket = SocketManager.getVideoSocket();
      }
      
      if (videoSocket && videoSocket.connected) {
        console.log("[PreJoinPanel] Sending initiate_call via centralized socket");
        videoSocket.emit("initiate_call", { 
          callId, 
          targetUserId,
          fromUserName: `${user.name || "Unknown"} ${user.surname || "User"}`
        });
        console.log("[PreJoinPanel] Call notification sent successfully");
      } else {
        console.error("[PreJoinPanel] Video socket not available after reconnection attempt");
      }
    } catch (error) {
      console.error("[PreJoinPanel] Failed to send call notification:", error);
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Request both microphone and camera permissions simultaneously
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Wait for devices to be loaded first
        if (devicesLoading) {
          console.log('[PreJoinPanel] Waiting for devices to load...');
          return;
        }
        
        // Request both audio and video permissions with proper constraints
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(audioDeviceId && { deviceId: { exact: audioDeviceId } })
          },
          video: {
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 },
            frameRate: { min: 15, ideal: 30 },
            ...(videoDeviceId && { deviceId: { exact: videoDeviceId } })
          }
        };
        
        console.log('[PreJoinPanel] Requesting media with constraints:', constraints);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        setLocalStream(stream);
        
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
        }
        
        // Auto-select first available devices if not already selected
        if (!audioDeviceId && mics.length > 0) {
          console.log('[PreJoinPanel] Auto-selecting first microphone:', mics[0].label);
          setAudioDeviceId(mics[0].deviceId);
        }
        if (!videoDeviceId && cameras.length > 0) {
          console.log('[PreJoinPanel] Auto-selecting first camera:', cameras[0].label);
          setVideoDeviceId(cameras[0].deviceId);
        }
        
        setIsLoading(false);
          } catch (e: any) {
            console.error("Failed to get user media:", e);
            
            // Provide specific error messages based on error type
            let errorMessage = "Camera and microphone access is required for video calls.";
            
            if (e.name === 'NotAllowedError') {
              errorMessage = "Permission denied. Please allow camera and microphone access and refresh the page.";
            } else if (e.name === 'NotFoundError') {
              errorMessage = "No camera or microphone found. Please connect a camera and microphone.";
            } else if (e.name === 'NotReadableError') {
              errorMessage = "Camera is being used by another application. Click 'Try Again' to wait 5 seconds and retry.";
            } else if (e.name === 'OverconstrainedError') {
              errorMessage = "Camera or microphone constraints cannot be satisfied.";
            }
            
            setError(errorMessage);
            setIsLoading(false);
          }
    })();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mics, cameras, audioDeviceId, videoDeviceId, devicesLoading]); // Include device dependencies

  return (
    <div className="cl-prejoin">
      {/* Camera Preview Section */}
      <div className="cl-pre-card cl-preview-section">
        <div className="cl-preview-header">
          <h3>Camera Preview</h3>
          <div className="cl-preview-status">
            {isLoading ? (
              <span className="cl-status-loading">Loading...</span>
            ) : localStream ? (
              <span className="cl-status-active">Camera Active</span>
            ) : (
              <span className="cl-status-error">Camera Off</span>
            )}
          </div>
        </div>
        
        <div className="cl-preview-container">
          {isLoading ? (
            <div className="cl-preview-loading">
              <div className="cl-loading-spinner"></div>
              <p>Requesting camera and microphone access...</p>
            </div>
          ) : (
            <video 
              ref={previewRef} 
              autoPlay 
              playsInline 
              muted 
              className="cl-preview-video"
            />
          )}
        </div>
      </div>

      {/* Device Selection Section */}
      <div className="cl-pre-card cl-device-section">
        <h3>Device Settings</h3>
        
        <div className="cl-device-group">
          <div className="cl-device-item">
            <label className="cl-device-label">
              <i className="fas fa-microphone cl-device-icon"></i>
              Microphone
            </label>
            <select 
              value={audioDeviceId || ""} 
              onChange={(e) => setAudioDeviceId(e.target.value || undefined)}
              className="cl-device-select"
              disabled={isLoading}
            >
              <option value="">Default Microphone</option>
              {mics.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${m.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="cl-device-item">
            <label className="cl-device-label">
              <i className="fas fa-video cl-device-icon"></i>
              Camera
            </label>
            <select 
              value={videoDeviceId || ""} 
              onChange={(e) => setVideoDeviceId(e.target.value || undefined)}
              className="cl-device-select"
              disabled={isLoading}
            >
              <option value="">Default Camera</option>
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(error || devicesError) && (
          <div className="cl-error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error || devicesError}
            {devicesError && (
              <button 
                onClick={refreshDevices}
                style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Retry
              </button>
            )}
            {error && error.includes('being used by another application') && (
              <button 
                onClick={handleDeviceRetry}
                disabled={showDeviceRetry}
                style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  background: showDeviceRetry ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: showDeviceRetry ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                {showDeviceRetry ? `Waiting... (${retryCountdown}s)` : 'Try Again'}
              </button>
            )}
          </div>
        )}

        <div className="cl-pre-actions">
          <button 
            onClick={onCancel} 
            className="cl-btn-cancel"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              // Send notification first if this is the initiator
              await sendCallNotification();
              // Notify parent that call is starting
              onCallStateChange?.(true);
              // Then proceed with joining the call
              onConfirm({ audioDeviceId, videoDeviceId });
            }} 
            className="cl-btn-join"
            disabled={isLoading || !!error || isSendingNotification}
          >
            {isLoading ? "Loading..." : isSendingNotification ? "Sending..." : "Join Call"}
          </button>
        </div>
      </div>
    </div>
  );
};


