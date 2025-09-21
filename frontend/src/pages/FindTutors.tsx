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
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const { user, token, pfpTimestamps } = useAuthStore();

  const ratingOptions = [
    { value: 0, label: "Any Rating" },
    { value: 2, label: "+2 Stars" },
    { value: 3, label: "+3 Stars" },
    { value: 4, label: "+4 Stars" },
    { value: 4.5, label: "+4.5 Stars" },
  ];

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "newest", label: "Newest" },
    { value: "rating", label: "Rating" },
  ];

  const handleSubjectChange = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const handleRatingChange = (rating: number) => {
    setRatingFilter(rating);
    setShowRatingDropdown(false);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setShowSortDropdown(false);
  };

  const clearAllFilters = () => {
    setSelectedSubjects([]);
    setRatingFilter(0);
    setSearchQuery("");
    setSortBy("relevance");
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

    // Apply sorting
    if (sortBy === "rating") {
      filteredTutors.sort((a, b) => {
        const aRating =
          a.rating.count > 0 ? a.rating.totalScore / a.rating.count : 0;
        const bRating =
          b.rating.count > 0 ? b.rating.totalScore / b.rating.count : 0;
        return bRating - aRating;
      });
    } else if (sortBy === "newest") {
      // Assuming there's a createdAt field, otherwise use a default
      filteredTutors.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
    } else {
      // Relevance (default)
      filteredTutors.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    setDisplayedTutors(filteredTutors);
  }, [allTutors, selectedSubjects, ratingFilter, searchQuery, sortBy]);

  const getRatingLabel = () => {
    const option = ratingOptions.find((opt) => opt.value === ratingFilter);
    return option ? option.label : "Any Rating";
  };

  const getSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === sortBy);
    return option ? option.label : "Relevance";
  };

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
          {(selectedSubjects.length > 0 ||
            ratingFilter > 0 ||
            searchQuery ||
            sortBy !== "relevance") && (
            <button className="clear-filters-btn" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label>Subjects</label>
            <div className="dropdown-filter-container">
              <div
                className="dropdown-trigger"
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
                <div className="dropdown-menu">
                  <div className="dropdown-list">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject}
                        className={`dropdown-option ${selectedSubjects.includes(subject) ? "selected" : ""}`}
                        onClick={() => handleSubjectChange(subject)}
                      >
                        <div className="option-checkbox">
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
              <div className="selected-chips">
                {selectedSubjects.map((subject) => (
                  <div key={subject} className="filter-chip">
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
            <label>Minimum Rating</label>
            <div className="dropdown-filter-container">
              <div
                className="dropdown-trigger"
                onClick={() => setShowRatingDropdown(!showRatingDropdown)}
              >
                <span>{getRatingLabel()}</span>
                <i
                  className={`fas fa-chevron-${showRatingDropdown ? "up" : "down"}`}
                ></i>
              </div>

              {showRatingDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-list">
                    {ratingOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`dropdown-option ${ratingFilter === option.value ? "selected" : ""}`}
                        onClick={() => handleRatingChange(option.value)}
                      >
                        <div className="option-checkbox">
                          {ratingFilter === option.value && (
                            <i className="fas fa-check"></i>
                          )}
                        </div>
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowRatingDropdown(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <div className="dropdown-filter-container">
              <div
                className="dropdown-trigger"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                <span>{getSortLabel()}</span>
                <i
                  className={`fas fa-chevron-${showSortDropdown ? "up" : "down"}`}
                ></i>
              </div>

              {showSortDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-list">
                    {sortOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`dropdown-option ${sortBy === option.value ? "selected" : ""}`}
                        onClick={() => handleSortChange(option.value)}
                      >
                        <div className="option-checkbox">
                          {sortBy === option.value && (
                            <i className="fas fa-check"></i>
                          )}
                        </div>
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowSortDropdown(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="results-header">
        <h3>
          {displayedTutors.length}{" "}
          {displayedTutors.length === 1 ? "Tutor" : "Tutors"} Available
          {(selectedSubjects.length > 0 ||
            ratingFilter > 0 ||
            searchQuery ||
            sortBy !== "relevance") && (
            <span className="filter-indicator">(filtered)</span>
          )}
        </h3>
      </div>

      <div className="tutor-grid">
        {displayedTutors.map((tutor) => {
          const pfpSrc = `/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;
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
