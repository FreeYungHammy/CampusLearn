import React, { useEffect } from "react";

interface SuccessNotificationProps {
  show: boolean;
  onClose: () => void;
  message: string;
  duration?: number;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  show,
  onClose,
  message,
  duration = 4000,
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
    <div className="success-notification-overlay">
      <div className="success-notification">
        <div className="success-notification-content">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="success-message">
            <h4>Success!</h4>
            <p>{message}</p>
          </div>
          <button
            className="success-close-btn"
            onClick={onClose}
            aria-label="Close notification"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="success-progress-bar">
          <div className="success-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default SuccessNotification;
