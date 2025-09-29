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

const PAGE_SIZE = 12;

const FindTutors = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [totalTutors, setTotalTutors] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // UI State
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modal State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  const { user, token, pfpTimestamps, updatePfpTimestamps } = useAuthStore();

  console.log("FindTutors.tsx: user object from authStore:", user);

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

  const fetchTutors = async (page: number, filters: any) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const { tutors: fetchedTutors, totalCount } = await getTutors(
        PAGE_SIZE,
        offset,
        filters,
      );

      const subscribedTutors = await getMySubscribedTutors(user!.id, token).then(
        (res) => res.data,
      );
      const subscribedTutorIds = new Set(subscribedTutors.map((t: any) => t.id));
      const availableTutors = fetchedTutors.filter(
        (tutor: Tutor) => !subscribedTutorIds.has(tutor.id),
      );

      setTutors((prevTutors) =>
        page === 1 ? availableTutors : [...prevTutors, ...availableTutors],
      );
      setTotalTutors(totalCount);

      const timestamps = availableTutors.reduce((acc, tutor) => {
        if (tutor.pfpTimestamp) {
          acc[tutor.userId] = tutor.pfpTimestamp;
        }
        return acc;
      }, {} as { [userId: string]: number });
      updatePfpTimestamps(timestamps);
    } catch (err) {
      setError("Failed to fetch tutors. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const studentSubjects = user?.enrolledCourses || [];
    setAvailableSubjects(studentSubjects.sort());

    const filters = { searchQuery, subjects: selectedSubjects.join(','), rating: ratingFilter, sortBy };
    setTutors([]); // Reset tutors before fetching
    setCurrentPage(1);
    fetchTutors(1, filters);
  }, [searchQuery, selectedSubjects, ratingFilter, sortBy, token, user]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    const filters = { searchQuery, subjects: selectedSubjects.join(','), rating: ratingFilter, sortBy };
    setCurrentPage(nextPage);
    fetchTutors(nextPage, filters);
  };

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

  const getRatingLabel = () => {
    const option = ratingOptions.find((opt) => opt.value === ratingFilter);
    return option ? option.label : "Any Rating";
  };

  const getSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === sortBy);
    return option ? option.label : "Relevance";
  };

  const handleSubscribe = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowSubscribeModal(true);
  };

  const handleConfirmSubscribe = async () => {
    if (!token || !selectedTutor) return;
    try {
      await subscribeToTutor(selectedTutor.id, token);
      // Optimistically remove the tutor from the list
      setTutors((prev) => prev.filter((tutor) => tutor.id !== selectedTutor.id));
      setTotalTutors((prev) => prev - 1);
    } catch (error) {
      console.error("Failed to subscribe:", error);
      // Optionally, add the tutor back if the subscription fails
    } finally {
      setShowSubscribeModal(false);
      setSelectedTutor(null);
    }
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
          {totalTutors} {totalTutors === 1 ? "Tutor" : "Tutors"} Available
          {(selectedSubjects.length > 0 ||
            ratingFilter > 0 ||
            searchQuery ||
            sortBy !== "relevance") && (
            <span className="filter-indicator">(filtered)</span>
          )}
        </h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tutor-grid">
        {tutors.map((tutor) => {
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

      {isLoading && (
        <div className="loading-indicator">
          <p>Loading tutors...</p>
        </div>
      )}

      {!isLoading && tutors.length < totalTutors && (
        <div className="load-more-container">
          <button onClick={handleLoadMore} className="btn btn-primary">
            Load More Tutors
          </button>
        </div>
      )}

      {!isLoading && tutors.length === 0 && !error && (
        <div className="empty-state">
          <i className="fas fa-user-graduate"></i>
          <h3>No Tutors Available</h3>
          <p>Check back later for new tutors.</p>
        </div>
      )}

      {selectedTutor && (
        <SubscribeConfirmationModal
          show={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          onConfirm={handleConfirmSubscribe}
          isSubmitting={false} // This could be wired to a new state if needed
          tutorName={`${selectedTutor.name} ${selectedTutor.surname}`}
        />
      )}
    </div>
  );
};

export default FindTutors;
