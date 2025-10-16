import React, { useEffect, useState } from "react";
import { useCallNotifications } from "@/hooks/useCallNotifications";

export const CallNotification: React.FC = () => {
  const { incomingCall, answerCall, declineCall, dismissNotification } = useCallNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      setIsVisible(true);
      
      // Auto-dismiss after 30 seconds
      const timer = setTimeout(() => {
        dismissNotification();
      }, 30000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [incomingCall, dismissNotification]);

  if (!isVisible || !incomingCall) return null;

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 10000,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
      minWidth: "300px",
      animation: "slideIn 0.3s ease-out",
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "pulse 2s infinite",
        }}>
          📞
        </div>
        <div>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>
            Incoming Video Call
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            from {incomingCall.fromUserName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={answerCall}
          style={{
            flex: 1,
            background: "#10b981",
            color: "white",
            border: "none",
            padding: "12px 16px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#059669"}
          onMouseOut={(e) => e.currentTarget.style.background = "#10b981"}
        >
          Answer
        </button>
        <button
          onClick={declineCall}
          style={{
            flex: 1,
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "12px 16px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#dc2626"}
          onMouseOut={(e) => e.currentTarget.style.background = "#ef4444"}
        >
          Decline
        </button>
      </div>

      <button
        onClick={dismissNotification}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          fontSize: "18px",
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
};

