import React, { useState, useEffect } from "react";
import Dialog from "./ui/Dialog";
import { motion, AnimatePresence } from "framer-motion";
import { getMySubscribedTutors } from "../services/subscriptionApi";
import type { Tutor } from "../types/Tutors";
import { useAuthStore } from "../store/authStore";

interface TutorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTutor: (tutor: Tutor) => void;
}

export default function TutorSelectionModal({
  isOpen,
  onClose,
  onSelectTutor
}: TutorSelectionModalProps) {
  const [subscribedTutors, setSubscribedTutors] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, user, pfpTimestamps } = useAuthStore();

  useEffect(() => {
    if (isOpen && token && user) {
      loadSubscribedTutors();
    }
  }, [isOpen, token, user]);

  const loadSubscribedTutors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMySubscribedTutors(user!.id);
      console.log('Subscribed tutors response:', response.data);
      setSubscribedTutors(response.data);
    } catch (err: any) {
      console.error('Failed to load subscribed tutors:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please refresh the page and log in again.');
      } else {
        setError('Failed to load your subscribed tutors. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTutorSelect = (tutor: Tutor) => {
    onSelectTutor(tutor);
    onClose();
  };

  const getPfpSrc = (tutor: Tutor) => {
    // Use the same approach as FindTutors for consistency
    return `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledById="tutor-selection-title">
      <h2 id="tutor-selection-title" className="modal-title">
        <i className="fas fa-users"></i>
        Select a Tutor
      </h2>
      
      <div className="modal-body">
        <p className="tutor-selection-info">
          Choose a tutor from your subscribed tutors to book a session with.
        </p>

        {isLoading && (
          <div className="tutor-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading your tutors...</span>
          </div>
        )}

        {error && (
          <div className="tutor-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
            <button 
              className="btn btn-primary mt-3"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-refresh"></i>
              Refresh Page
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {subscribedTutors.length === 0 ? (
              <div className="tutor-empty">
                <i className="fas fa-user-graduate"></i>
                <h3>No Subscribed Tutors</h3>
                <p>You haven't subscribed to any tutors yet. Visit the Find Tutors page to discover and subscribe to tutors.</p>
                <button 
                  className="btn btn-primary mt-4"
                  onClick={onClose}
                >
                  Go to Find Tutors
                </button>
              </div>
            ) : (
              <div className="tutor-selection-list">
                <AnimatePresence>
                  {(subscribedTutors || []).map((tutor, index) => {
                    const avgRating = tutor.rating.count > 0 
                      ? (tutor.rating.totalScore / tutor.rating.count).toFixed(1)
                      : "Unrated";
                    
                    return (
                      <motion.div
                        key={tutor.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.1 }}
                        className="tutor-selection-item"
                        onClick={() => handleTutorSelect(tutor)}
                      >
                        <div className="tutor-avatar">
                          <img
                            src={getPfpSrc(tutor)}
                            alt={`${tutor.name} ${tutor.surname}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://via.placeholder.com/60x60/3498db/ffffff?text=" + (tutor.name?.charAt(0) || 'U');
                            }}
                          />
                        </div>
                        <div className="tutor-info">
                          <div className="tutor-header">
                            <h3 className="tutor-name">{tutor.name} {tutor.surname}</h3>
                            <div className="tutor-rating">
                              <i className="fas fa-star"></i>
                              <span>{avgRating}</span>
                              <span className="rating-count">({tutor.rating.count})</span>
                            </div>
                          </div>
                          <div className="tutor-subjects">
                            {tutor.subjects.slice(0, 3).map((subject, idx) => (
                              <span key={idx} className="subject-tag">
                                {subject}
                              </span>
                            ))}
                            {tutor.subjects.length > 3 && (
                              <span className="subject-tag more">
                                +{tutor.subjects.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="tutor-action">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Back
        </button>
      </div>
    </Dialog>
  );
}
