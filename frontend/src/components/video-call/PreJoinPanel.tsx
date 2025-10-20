import React, { useEffect, useRef, useState } from "react";
import { useDevices } from "../../hooks/webrtc/useDevices";

type Props = {
  onConfirm: (sel: { audioDeviceId?: string; videoDeviceId?: string }) => void;
  onCancel: () => void;
};

export const PreJoinPanel: React.FC<Props> = ({ onConfirm, onCancel }) => {
  const { cameras, mics, isLoading: devicesLoading, error: devicesError, refreshDevices } = useDevices();
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

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
          errorMessage = "Camera or microphone is being used by another application.";
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
            onClick={() => onConfirm({ audioDeviceId, videoDeviceId })} 
            className="cl-btn-join"
            disabled={isLoading || !!error}
          >
            {isLoading ? "Loading..." : "Join Call"}
          </button>
        </div>
      </div>
    </div>
  );
};


