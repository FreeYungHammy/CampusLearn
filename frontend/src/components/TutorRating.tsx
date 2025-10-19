import React, { useState, useEffect } from "react";
import { tutorRatingApi } from "../services/tutorRatingApi";
import { useAuthStore } from "../store/authStore";

interface TutorRatingProps {
  tutorId: string;
  onRatingChange?: (rating: number | null) => void;
  size?: "small" | "medium" | "large";
}

const TutorRating: React.FC<TutorRatingProps> = ({
  tutorId,
  onRatingChange,
  size = "medium",
}) => {
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (token && tutorId) {
      loadRatingData();
    }
  }, [token, tutorId]);

  const loadRatingData = async () => {
    setIsLoading(true);
    try {
      const [ratingResponse, canRateResponse] = await Promise.all([
        tutorRatingApi.getMyRating(tutorId, token!),
        tutorRatingApi.canRateTutor(tutorId, token!),
      ]);

      setCurrentRating(ratingResponse.rating);
      setCanRate(canRateResponse.canRate);
    } catch (error) {
      console.error("Error loading rating data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingClick = async (rating: number) => {
    if (!canRate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await tutorRatingApi.rateTutor(tutorId, rating, token!);
      setCurrentRating(rating);
      setShowRatingModal(false);
      onRatingChange?.(rating);
      
      // Reload rating data to ensure consistency
      await loadRatingData();
    } catch (error) {
      console.error("Error rating tutor:", error);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "small":
        return "rating-small";
      case "large":
        return "rating-large";
      default:
        return "rating-medium";
    }
  };

  if (isLoading) {
    return <div className="tutor-rating-loading">Loading...</div>;
  }

  if (!canRate) {
    return null; // Don't show rating component if user can't rate
  }

  const displayRating = hoveredRating || currentRating;

  return (
    <div className={`tutor-rating-modern ${getSizeClass()}`}>
      {currentRating ? (
        <div className="rating-display">
          <div className="rating-stars-display">
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`fas fa-star ${star <= currentRating ? "filled" : ""}`}
              />
            ))}
          </div>
          <span className="rating-value">{currentRating}/5</span>
          <button
            className="edit-rating-btn"
            onClick={() => setShowRatingModal(true)}
            title="Edit rating"
          >
            <i className="fas fa-edit"></i>
          </button>
        </div>
      ) : (
        <button
          className="rate-tutor-btn"
          onClick={() => setShowRatingModal(true)}
        >
          <i className="fas fa-star"></i>
          Rate Tutor
        </button>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="rating-modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rating-modal-header">
              <h3>Rate this Tutor</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowRatingModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="rating-modal-content">
              <div className="star-rating-modal">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn-modal ${displayRating && star <= displayRating ? "active" : ""} ${
                      isSubmitting ? "disabled" : ""
                    }`}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    disabled={isSubmitting}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                ))}
              </div>
              <div className="rating-feedback">
                {displayRating && (
                  <span className="rating-text-modal">
                    {displayRating} star{displayRating !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {isSubmitting && (
                <div className="rating-submitting">
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorRating;
