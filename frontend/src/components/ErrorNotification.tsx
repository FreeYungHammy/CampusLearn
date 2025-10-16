import React, { useEffect } from "react";

interface ErrorNotificationProps {
  show: boolean;
  onClose: () => void;
  message: string;
  duration?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  show,
  onClose,
  message,
  duration = 5000,
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="error-notification-overlay">
      <div className="error-notification">
        <div className="error-notification-content">
          <div className="error-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="error-message">
            <h4>Upload Failed</h4>
            <p>{message}</p>
          </div>
          <button
            className="error-close-btn"
            onClick={onClose}
            aria-label="Close notification"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="error-progress-bar">
          <div className="error-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
