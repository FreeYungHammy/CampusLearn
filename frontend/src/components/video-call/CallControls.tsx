import React from "react";

type Props = {
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenshare: () => void;
  onLeave: () => void;
  onReconnect?: () => void;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  isReconnecting?: boolean;
};

export const CallControls: React.FC<Props> = ({ onToggleMic, onToggleCam, onToggleScreenshare, onLeave, onReconnect, micOn, camOn, sharing, isReconnecting }) => {
  return (
    <div className="cl-dock">
      <button onClick={onToggleMic} className={`cl-btn ${micOn ? 'cl-btn--primary' : 'cl-btn--off'}`} title={micOn ? "Mute" : "Unmute"} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>
        {micOn ? (
          // mic icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" fill="currentColor"/>
            <path d="M19 11a7 7 0 01-14 0h2a5 5 0 0010 0h2z" fill="currentColor"/>
            <path d="M11 18h2v3h-2z" fill="currentColor"/>
          </svg>
        ) : (
          // mic off icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" fill="currentColor"/>
            <path d="M19 11a7 7 0 01-14 0h2a5 5 0 0010 0h2z" fill="currentColor"/>
            <path d="M4 4l16 16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      <button onClick={onToggleCam} className={`cl-btn ${camOn ? 'cl-btn--primary' : 'cl-btn--off'}`} title={camOn ? "Disable Video" : "Enable Video"} aria-label={camOn ? "Disable camera" : "Enable camera"}>
        {camOn ? (
          // video on
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6a2 2 0 012-2h8a2 2 0 012 2v3l4-3v12l-4-3v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" fill="currentColor"/>
          </svg>
        ) : (
          // video off
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6a2 2 0 012-2h7.34L4 13.34V6z" fill="currentColor"/>
            <path d="M22 7l-5 3.5V7l-4.17 4.17L22 19V7z" fill="currentColor"/>
            <path d="M2 2l20 20" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      <button onClick={onToggleScreenshare} className="cl-btn" title={sharing ? "Stop Share" : "Share Screen"} aria-label={sharing ? "Stop screen share" : "Start screen share"}>
        {sharing ? (
          // stop share icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="12" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M8 21h8" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 9l8 6M16 9l-8 6" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ) : (
          // share icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="12" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M12 9v4M12 9l-2 2M12 9l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 21h8" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
      </button>
      {onReconnect && (
        <button 
          onClick={onReconnect} 
          disabled={isReconnecting}
          className={`cl-btn ${isReconnecting ? 'cl-btn--off' : ''}`} 
          title={isReconnecting ? "Reconnecting..." : "Reconnect"} 
          aria-label={isReconnecting ? "Reconnecting..." : "Reconnect call"}
        >
          {isReconnecting ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      )}
      <button onClick={onLeave} className="cl-btn cl-btn--danger" title="Leave" aria-label="Leave call">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};


