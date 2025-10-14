import React, { useState, useRef, useEffect } from "react";

export interface VideoQuality {
  name: string;
  label: string;
}

interface VideoQualitySelectorProps {
  currentQuality: string;
  availableQualities: VideoQuality[];
  onQualityChange: (quality: string) => void;
  className?: string;
}

const VideoQualitySelector: React.FC<VideoQualitySelectorProps> = ({
  currentQuality,
  availableQualities,
  onQualityChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpward, setIsUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentQualityLabel = () => {
    const quality = availableQualities.find((q) => q.name === currentQuality);
    return quality ? quality.label : currentQuality;
  };

  const handleQualitySelect = (quality: string) => {
    onQualityChange(quality);
    setIsOpen(false);
  };

  // Check if dropdown should open upward to stay within bounds
  const checkDropdownPosition = () => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 150; // max-height from CSS

    // If dropdown would go off-screen at bottom, open upward
    const shouldOpenUpward = rect.bottom + dropdownHeight > viewportHeight - 20;
    setIsUpward(shouldOpenUpward);
  };

  // Close dropdown when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      checkDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  return (
    <div className={`video-quality-selector ${className}`}>
      <div className="quality-dropdown">
        <button
          className="quality-button"
          onClick={() => setIsOpen(!isOpen)}
          title="Select video quality"
        >
          <span className="quality-label">{getCurrentQualityLabel()}</span>
          <i className={`fas fa-chevron-down ${isOpen ? "open" : ""}`}></i>
        </button>

        {isOpen && (
          <div
            className={`quality-menu ${isUpward ? "upward" : ""}`}
            ref={dropdownRef}
          >
            {availableQualities.map((quality) => (
              <button
                key={quality.name}
                className={`quality-option ${currentQuality === quality.name ? "selected" : ""}`}
                onClick={() => handleQualitySelect(quality.name)}
              >
                <div className="quality-info">
                  <span className="quality-name">{quality.label}</span>
                </div>
                {currentQuality === quality.name && (
                  <i className="fas fa-check"></i>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoQualitySelector;
