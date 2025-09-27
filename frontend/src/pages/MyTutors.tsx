import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getMySubscribedTutors,
  unsubscribeFromTutor,
} from "../services/subscriptionApi";
import { useAuthStore } from "../store/authStore";
import type { Tutor } from "../types/Tutors";
import UnsubscribeConfirmationModal from "../components/UnsubscribeConfirmationModal";

const MyTutors = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const { user, token, pfpTimestamps } = useAuthStore();

  const handleUnsubscribe = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowUnsubscribeModal(true);
  };

  const handleConfirmUnsubscribe = async () => {
    if (!token || !selectedTutor) return;
    try {
      await unsubscribeFromTutor(selectedTutor.id, token);
      setTutors((prev) =>
        prev.filter((tutor) => tutor.id !== selectedTutor.id),
      );
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    } finally {
      setShowUnsubscribeModal(false);
      setSelectedTutor(null);
    }
  };

  useEffect(() => {
    const fetchSubscribedTutors = async () => {
      if (!user || !token) return;
      try {
        setIsLoading(true);
        const response = await getMySubscribedTutors(user.id, token);
        setTutors(response.data);
      } catch (error) {
        console.error("Failed to fetch subscribed tutors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscribedTutors();
  }, [user, token]);

  return (
    <div className="content-view" id="mytutors-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-user-friends"></i>My Tutors
        </h2>
      </div>

      {isLoading ? (
        <p>Loading your tutors...</p>
      ) : tutors.length === 0 ? (
        <div className="empty-state">
          <h3>No Subscriptions Yet</h3>
          <p>You haven't subscribed to any tutors yet.</p>
          <Link to="/tutors" className="btn btn-primary">
            Find a Tutor
          </Link>
        </div>
      ) : (
        <div className="tutor-grid">
          {tutors.map((tutor) => {
            const pfpSrc = `/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;

            return (
              <div key={tutor.id} className="tutor-card">
                <div className="tutor-header">
                  <img src={pfpSrc} alt={tutor.name} className="tutor-avatar" />
                  <div className="tutor-info">
                    <h3>{`${tutor.name} ${tutor.surname}`}</h3>
                    <div className="rating">
                      <i className="fas fa-star"></i>{" "}
                      {tutor.rating.count === 0
                        ? "Unrated"
                        : (
                            tutor.rating.totalScore / tutor.rating.count
                          ).toFixed(1)}
                      <span className="rating-count">
                        ({tutor.rating.count})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tutor-stats">
                  <div className="stat">
                    <div className="stat-value">{tutor.studentCount}</div>
                    <div className="stat-label">Students</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{tutor.subjects.length}</div>
                    <div className="stat-label">Subjects</div>
                  </div>
                </div>

                <div className="tutor-subjects">
                  {tutor.subjects.slice(0, 3).map((subject, index) => (
                    <span key={index} className="subject-tag">
                      {subject}
                    </span>
                  ))}
                  {tutor.subjects.length > 3 && (
                    <span className="subject-tag more-tag">
                      +{tutor.subjects.length - 3} more
                    </span>
                  )}
                </div>

                <div className="tutor-actions">
                  <Link
                    to={`/tutors/${tutor.id}/content`}
                    className="view-profile-btn"
                  >
                    View Profile & Content
                  </Link>
                  <button
                    className={`unsubscribe-btn subscribed`}
                    onClick={() => handleUnsubscribe(tutor)}
                  >
                    <i className={`fas fa-user-minus`}></i>
                    Unsubscribe
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTutor && (
        <UnsubscribeConfirmationModal
          show={showUnsubscribeModal}
          onClose={() => setShowUnsubscribeModal(false)}
          onConfirm={handleConfirmUnsubscribe}
          isSubmitting={false} // This will be handled later
          tutorName={`${selectedTutor.name} ${selectedTutor.surname}`}
        />
      )}
    </div>
  );
};

export default MyTutors;
