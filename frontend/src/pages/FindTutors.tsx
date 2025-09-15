import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTutors } from "../services/tutorApi";
import {
  subscribeToTutor,
  getMySubscribedTutors,
} from "../services/subscriptionApi";
import { arrayBufferToBase64 } from "../utils/image";
import type { Tutor } from "../types/Tutors";
import { useAuthStore } from "../store/authStore";

const FindTutors = () => {
  const [allTutors, setAllTutors] = useState<Tutor[]>([]);
  const [displayedTutors, setDisplayedTutors] = useState<Tutor[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const { user, token } = useAuthStore();

  const handleSubjectChange = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const handleSubscribe = async (tutorId: string) => {
    if (!token) return;
    try {
      await subscribeToTutor(tutorId, token);
      // Optimistically remove the tutor from the list
      setAllTutors((prev) => prev.filter((tutor) => tutor.id !== tutorId));
    } catch (error) {
      console.error("Failed to subscribe:", error);
      // Handle error display to the user
    }
  };

  useEffect(() => {
    const fetchAndPersonalizeTutors = async () => {
      if (!user || user.role !== "student" || !token) return;

      try {
        const [fetchedTutors, subscribedTutors] = await Promise.all([
          getTutors(),
          getMySubscribedTutors(user.id, token).then((res) => res.data),
        ]);

        const subscribedTutorIds = new Set(
          subscribedTutors.map((t: any) => t.id),
        );

        const availableTutors = fetchedTutors.filter(
          (tutor: Tutor) => !subscribedTutorIds.has(tutor.id),
        );

        const studentSubjects = user.enrolledCourses || [];

        const personalizedTutors = availableTutors.map((tutor) => {
          const matchingSubjects = tutor.subjects.filter((subject) =>
            studentSubjects.includes(subject),
          ).length;

          const ratingForCalc = (() => {
            if (!tutor.rating || tutor.rating.count === 0) return 3.0;
            if (typeof tutor.rating.totalScore === "number") {
              return tutor.rating.totalScore / tutor.rating.count;
            }
            if (typeof (tutor.rating as any).average === "number") {
              return (tutor.rating as any).average;
            }
            return 0.0;
          })();

          const relevanceScore = 3 * matchingSubjects + 2 * ratingForCalc;
          return { ...tutor, relevanceScore };
        });

        personalizedTutors.sort((a, b) => b.relevanceScore - a.relevanceScore);
        setAllTutors(personalizedTutors);

        setAvailableSubjects(studentSubjects.sort());
      } catch (error) {
        console.error("Failed to fetch and sort tutors:", error);
      }
    };

    fetchAndPersonalizeTutors();
  }, [user, token]);

  useEffect(() => {
    let filteredTutors = [...allTutors];

    // Apply subject filter
    if (selectedSubjects.length > 0) {
      filteredTutors = filteredTutors.filter((tutor) =>
        selectedSubjects.every((subject) => tutor.subjects.includes(subject)),
      );
    }

    // Apply rating filter
    if (ratingFilter > 0) {
      filteredTutors = filteredTutors.filter((tutor) => {
        const avgRating =
          tutor.rating.count > 0
            ? tutor.rating.totalScore / tutor.rating.count
            : 0;
        return avgRating >= ratingFilter;
      });
    }

    setDisplayedTutors(filteredTutors);
  }, [allTutors, selectedSubjects, ratingFilter]);

  return (
    <div className="content-view" id="tutors-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-user-graduate"></i>Find Tutors
        </h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for tutors..."
            className="form-control"
          />
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group subject-filter">
          <label>Filter by Subject</label>
          <div className="checkbox-group">
            {availableSubjects.map((subject) => (
              <div key={subject} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`subject-${subject}`}
                  value={subject}
                  checked={selectedSubjects.includes(subject)}
                  onChange={() => handleSubjectChange(subject)}
                />
                <label htmlFor={`subject-${subject}`}>{subject}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label htmlFor="rating-filter">Minimum Rating</label>
          <select
            id="rating-filter"
            className="form-control"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
          >
            <option value="0">Any Rating</option>
            <option value="2">+2 Stars</option>
            <option value="3">+3 Stars</option>
            <option value="4">+4 Stars</option>
            <option value="4.5">+4.5 Stars</option>
          </select>
        </div>
      </div>

      <div className="tutor-grid">
        {displayedTutors.map((tutor) => {
          const pfpSrc = tutor.pfp
            ? `data:${tutor.pfp.contentType};base64,${arrayBufferToBase64(
                tutor.pfp.data.data,
              )}`
            : "https://randomuser.me/api/portraits/men/32.jpg"; // Default avatar

          return (
            <div key={tutor.id} className="tutor-card">
              <div className="tutor-header">
                <img
                  src={pfpSrc}
                  alt={`${tutor.name} ${tutor.surname}`}
                  className="tutor-avatar"
                />
                <div className="tutor-info">
                  <h3>{`${tutor.name} ${tutor.surname}`}</h3>
                  <div className="rating">
                    <i className="fas fa-star"></i>{" "}
                    {tutor.rating.count === 0
                      ? "Unrated"
                      : (tutor.rating.totalScore / tutor.rating.count).toFixed(
                          1,
                        )}
                  </div>
                </div>
              </div>

              <div className="tutor-stats">
                <div className="stat">
                  <div className="stat-value">0</div>
                  <div className="stat-label">Students</div>
                </div>
              </div>

              <div className="tutor-subjects">
                {tutor.subjects.map((subject, index) => (
                  <span key={index} className="subject-tag">
                    {subject}
                  </span>
                ))}
              </div>

              <div className="tutor-actions">
                <Link
                  to={`/tutors/${tutor.id}/content`}
                  className="view-profile-btn"
                >
                  View Profile & Content
                </Link>
                <button
                  className={`btn btn-sm btn-success`}
                  onClick={() => handleSubscribe(tutor.id)}
                >
                  <i className={`fas fa-plus`}></i>
                  Subscribe
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FindTutors;
