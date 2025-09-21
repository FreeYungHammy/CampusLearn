import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTutors } from "../services/tutorApi";
import {
  subscribeToTutor,
  getMySubscribedTutors,
} from "../services/subscriptionApi";
import type { Tutor } from "../types/Tutors";
import { useAuthStore } from "../store/authStore";
import SubscribeConfirmationModal from "../components/SubscribeConfirmationModal";

const FindTutors = () => {
  const [allTutors, setAllTutors] = useState<Tutor[]>([]);
  const [displayedTutors, setDisplayedTutors] = useState<Tutor[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const { user, token } = useAuthStore();

  const handleSubjectChange = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const clearAllFilters = () => {
    setSelectedSubjects([]);
    setRatingFilter(0);
    setSearchQuery("");
  };

  const handleSubscribe = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowSubscribeModal(true);
  };

  const handleConfirmSubscribe = async () => {
    if (!token || !selectedTutor) return;
    try {
      await subscribeToTutor(selectedTutor.id, token);
      setAllTutors((prev) =>
        prev.filter((tutor) => tutor.id !== selectedTutor.id),
      );
    } catch (error) {
      console.error("Failed to subscribe:", error);
    } finally {
      setShowSubscribeModal(false);
      setSelectedTutor(null);
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

        const personalizedTutors = availableTutors
          .map((tutor) => {
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

            if (matchingSubjects === 0) {
              return null;
            }

            const relevanceScore = 3 * matchingSubjects + 2 * ratingForCalc;
            return { ...tutor, relevanceScore };
          })
          .filter(
            (tutor): tutor is Tutor & { relevanceScore: number } =>
              tutor !== null,
          );

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

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredTutors = filteredTutors.filter(
        (tutor) =>
          `${tutor.name} ${tutor.surname}`.toLowerCase().includes(query) ||
          tutor.subjects.some((subject) =>
            subject.toLowerCase().includes(query),
          ),
      );
    }

    setDisplayedTutors(filteredTutors);
  }, [allTutors, selectedSubjects, ratingFilter, searchQuery]);

  return (
    <div className="content-view" id="tutors-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-user-graduate"></i>Find Tutors
        </h2>
        <div className="search-bar">
          <div className="search-input-wrapper">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search tutors by name or subject..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-header">
          <h3>Filters</h3>
          {(selectedSubjects.length > 0 || ratingFilter > 0 || searchQuery) && (
            <button className="clear-filters-btn" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label>Subjects</label>
            <div className="subject-filter-container">
              <div
                className="subject-selector-trigger"
                onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              >
                <span>
                  {selectedSubjects.length > 0
                    ? `${selectedSubjects.length} selected`
                    : "Select subjects"}
                </span>
                <i
                  className={`fas fa-chevron-${showSubjectDropdown ? "up" : "down"}`}
                ></i>
              </div>

              {showSubjectDropdown && (
                <div className="subject-dropdown">
                  <div className="subject-list">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject}
                        className={`subject-option ${selectedSubjects.includes(subject) ? "selected" : ""}`}
                        onClick={() => handleSubjectChange(subject)}
                      >
                        <div className="subject-checkbox">
                          {selectedSubjects.includes(subject) && (
                            <i className="fas fa-check"></i>
                          )}
                        </div>
                        <span>{subject}</span>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowSubjectDropdown(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected subjects chips */}
            {selectedSubjects.length > 0 && (
              <div className="selected-subjects">
                {selectedSubjects.map((subject) => (
                  <div key={subject} className="subject-chip">
                    {subject}
                    <button
                      onClick={() => handleSubjectChange(subject)}
                      className="chip-remove"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="rating-filter">Minimum Rating</label>
            <div className="rating-select-wrapper">
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
              <i className="fas fa-star rating-select-icon"></i>
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-by-filter">Sort By</label>
            <div className="sort-by-select-wrapper">
              <select
                id="sort-by-filter"
                className="form-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="rating">Rating</option>
              </select>
              <i className="fas fa-sort-amount-down sort-by-select-icon"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="results-header">
        <h3>
          {displayedTutors.length}{" "}
          {displayedTutors.length === 1 ? "Tutor" : "Tutors"} Available
          {(selectedSubjects.length > 0 || ratingFilter > 0 || searchQuery) && (
            <span className="filter-indicator">(filtered)</span>
          )}
        </h3>
      </div>

      <div className="tutor-grid">
        {displayedTutors.map((tutor) => {
          const pfpSrc = `/api/users/${tutor.userId}/pfp`;
          const avgRating =
            tutor.rating.count > 0
              ? (tutor.rating.totalScore / tutor.rating.count).toFixed(1)
              : "Unrated";

          return (
            <div key={tutor.id} className="tutor-card">
              <div className="tutor-header">
                <img
                  src={pfpSrc}
                  alt={`${tutor.name} ${tutor.surname}`}
                  className="tutor-avatar"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiMzNDk4REIiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJ3aGl0ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBDMTMgMzcgMCA0MCAwIDQwSDQwQzQwIDQwIDI3IDM3IDIwIDBaIiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSIxMCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==";
                  }}
                />
                <div className="tutor-info">
                  <h3>{`${tutor.name} ${tutor.surname}`}</h3>
                  <div className="rating">
                    <i className="fas fa-star"></i> {avgRating}
                    <span className="rating-count">({tutor.rating.count})</span>
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
                  className="btn btn-sm btn-success subscribe-btn"
                  onClick={() => handleSubscribe(tutor)}
                >
                  <i className="fas fa-plus"></i>
                  Subscribe
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayedTutors.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-user-graduate"></i>
          <h3>No tutors match your filters</h3>
          <p>Try adjusting your filters or search query</p>
          <button className="btn btn-primary" onClick={clearAllFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {selectedTutor && (
        <SubscribeConfirmationModal
          show={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          onConfirm={handleConfirmSubscribe}
          isSubmitting={false}
          tutorName={`${selectedTutor.name} ${selectedTutor.surname}`}
        />
      )}
    </div>
  );
};

export default FindTutors;
