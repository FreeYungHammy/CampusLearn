import React, { useState, useRef, useEffect } from "react";

interface ReadMoreTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

const ReadMoreText: React.FC<ReadMoreTextProps> = ({
  text,
  maxLength = 200,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Check if text is longer than maxLength
    setShouldShowButton(text.length > maxLength);
  }, [text, maxLength]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const displayText = isExpanded ? text : text.substring(0, maxLength);
  const needsTruncation = text.length > maxLength;

  return (
    <div className={`read-more-container ${className}`}>
      <p ref={textRef} className="read-more-text">
        {displayText}
        {!isExpanded && needsTruncation && "..."}
      </p>
      {shouldShowButton && (
        <button
          className="read-more-btn"
          onClick={toggleExpanded}
          type="button"
        >
          {isExpanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
};

export default ReadMoreText;
