import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { getTutors } from "../services/tutorApi";
import {
  subscribeToTutor,
  getMySubscribedTutors,
} from "../services/subscriptionApi";
import type { Tutor } from "../types/Tutors";
import { useAuthStore } from "../store/authStore";
import SubscribeConfirmationModal from "../components/SubscribeConfirmationModal";
import TutorBookingModal from "../components/TutorBookingModal";
import AnimatedList from "../components/AnimatedList";
import PageHeader from "../components/PageHeader";

const PAGE_SIZE = 10;

const FindTutors = () => {
  const location = useLocation();
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

  // Advanced Filter State
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");

  // Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Dropdown toggle function
  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeDropdown]);

  // Track component mount/unmount (minimal logging)
  useEffect(() => {
    console.log("FindTutors: Component mounted");
    return () => {
      console.log("FindTutors: Component unmounted");
    };
  }, []);

  // Modal State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showBookingStepper, setShowBookingStepper] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { user, token, pfpTimestamps, updatePfpTimestamps } = useAuthStore();
  const isInitializedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);

  console.log("FindTutors.tsx: user object from authStore:", user);

  // Helper function to check if tutor subjects match student enrolled courses
  const canBookWithTutor = (
    tutor: Tutor,
  ): { canBook: boolean; reason?: string } => {
    if (user?.role !== "student") {
      return { canBook: false, reason: "Only students can book sessions" };
    }

    const studentCourses = (user as any).enrolledCourses || [];
    if (studentCourses.length === 0) {
      return {
        canBook: false,
        reason: "Please update your profile to include your enrolled courses",
      };
    }

    // Check if any tutor subject matches any student enrolled course
    const hasMatchingSubject = tutor.subjects.some((subject) =>
      studentCourses.includes(subject),
    );

    if (!hasMatchingSubject) {
      return {
        canBook: false,
        reason:
          "This tutor teaches subjects you are not enrolled in. Please update your profile or subscribe to this tutor first.",
      };
    }

    return { canBook: true };
  };

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
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * PAGE_SIZE;

      const { tutors: fetchedTutors, totalCount } = await getTutors(
        PAGE_SIZE,
        offset,
        filters,
      );

      const subscribedTutors = await getMySubscribedTutors(user!.id).then(
        (res) => res.data,
      );
      const subscribedTutorIds = new Set(
        subscribedTutors.map((t: any) => t.id),
      );
      const availableTutors = fetchedTutors.filter(
        (tutor: Tutor) => !subscribedTutorIds.has(tutor.id),
      );

      setTutors((prevTutors) => {
        const newTutors =
          page === 1 ? availableTutors : [...prevTutors, ...availableTutors];
        return newTutors;
      });
      setTotalTutors(totalCount);

      const timestamps = availableTutors.reduce(
        (acc, tutor) => {
          if ((tutor as any).pfpTimestamp) {
            acc[tutor.userId] = (tutor as any).pfpTimestamp;
          }
          return acc;
        },
        {} as { [userId: string]: number },
      );
      updatePfpTimestamps(timestamps);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      setError("Failed to fetch tutors. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Comprehensive initialization effect
  useEffect(() => {
    const currentUserId = user?.id;
    const userChanged = previousUserRef.current !== currentUserId;

    // Force complete re-initialization if user changed or component not initialized
    if (user && token && (userChanged || !isInitializedRef.current)) {
      console.log("FindTutors: Re-initializing component");

      // Reset all state completely
      setTutors([]);
      setTotalTutors(0);
      setCurrentPage(1);
      setIsLoading(false);
      setError(null);
      setSearchQuery("");
      setSelectedSubjects([]);
      setRatingFilter(0);
      setSortBy("relevance");

      // Set available subjects
      const studentSubjects = (user as any).enrolledCourses || [];
      setAvailableSubjects(studentSubjects.sort());

      // Mark as initialized
      isInitializedRef.current = true;
      previousUserRef.current = currentUserId || null;

      // Fetch tutors with default filters
      const filters = {
        searchQuery: "",
        subjects: "",
        rating: 0,
        sortBy: "relevance",
      };
      fetchTutors(1, filters);
    }
  }, [user?.id, token]);

  // Handle filter changes (only after initialization)
  useEffect(() => {
    if (isInitializedRef.current && user && token) {
      const filters = {
        searchQuery,
        subjects: selectedSubjects.join(","),
        rating: ratingFilter,
        sortBy,
      };
      setTutors([]); // Reset tutors before fetching
      setCurrentPage(1);
      fetchTutors(1, filters);
    }
  }, [searchQuery, selectedSubjects, ratingFilter, sortBy, token, user]);

  // Page visibility API to handle tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && token && isInitializedRef.current) {
        // Force re-fetch when user returns to this tab
        const filters = {
          searchQuery,
          subjects: selectedSubjects.join(","),
          rating: ratingFilter,
          sortBy,
        };
        setTutors([]);
        setCurrentPage(1);
        fetchTutors(1, filters);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, token, searchQuery, selectedSubjects, ratingFilter, sortBy]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Reset initialization flag
      isInitializedRef.current = false;
      previousUserRef.current = null;

      // Reset all state when component unmounts to prevent stale state
      setTutors([]);
      setTotalTutors(0);
      setCurrentPage(1);
      setIsLoading(false);
      setError(null);
    };
  }, []);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    const filters = {
      searchQuery,
      subjects: selectedSubjects.join(","),
      rating: ratingFilter,
      sortBy,
    };
    setCurrentPage(nextPage);
    fetchTutors(nextPage, filters);
  };

  // Advanced Filter Helper Functions
  const filteredSubjects = availableSubjects.filter((subject) =>
    subject.toLowerCase().includes(subjectSearchQuery.toLowerCase()),
  );

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const getSubjectIcon = (subject: string) => {
    const iconMap: { [key: string]: string } = {
      Mathematics: "fas fa-calculator",
      Programming: "fas fa-code",
      "Computer Architecture": "fas fa-microchip",
      "Database Development": "fas fa-database",
      "Web Programming": "fas fa-globe",
      "Linear Programming": "fas fa-chart-line",
      Statistics: "fas fa-chart-bar",
      "Software Testing": "fas fa-bug",
      "Network Development": "fas fa-network-wired",
      "Machine Learning": "fas fa-brain",
    };
    return <i className={iconMap[subject] || "fas fa-book"}></i>;
  };

  const getSortIcon = (sortValue: string) => {
    const iconMap: { [key: string]: string } = {
      relevance: "fas fa-magic",
      newest: "fas fa-clock",
      rating: "fas fa-star",
    };
    return <i className={iconMap[sortValue] || "fas fa-sort"}></i>;
  };

  const getRatingCount = () => {
    // This would normally filter tutors by rating, for now return a placeholder
    return tutors.filter((tutor) => {
      if (ratingFilter === 0) return true;
      const avgRating =
        tutor.rating.count > 0
          ? tutor.rating.totalScore / tutor.rating.count
          : 0;
      return avgRating >= ratingFilter;
    }).length;
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
      await subscribeToTutor(selectedTutor.id);
      // Optimistically remove the tutor from the list
      setTutors((prev) =>
        prev.filter((tutor) => tutor.id !== selectedTutor.id),
      );
      // Don't decrement totalTutors - it represents the backend total, not filtered count
      // The displayed count will automatically reflect the filtered tutors
    } catch (error) {
      console.error("Failed to subscribe:", error);
      // Optionally, add the tutor back if the subscription fails
    } finally {
      setShowSubscribeModal(false);
      setSelectedTutor(null);
    }
  };

  return (
    <div
      className="content-view"
      id="tutors-view"
      key={`tutors-${user?.id || "anonymous"}`}
    >
      <PageHeader
        title="Find Tutors"
        subtitle="Discover and connect with expert tutors in your subjects"
        icon="fas fa-user-graduate"
      />

      {/* MINIMALISTIC FILTER BAR - GRID LAYOUT */}
      <div className="minimal-filter-bar-grid">
        {/* ROW 1: Filter buttons + Info */}
        <div className="filter-row-1">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeDropdown === "sort" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown("sort");
              }}
            >
              <i className="fas fa-sort"></i>
              Sort By
              <i className="fas fa-chevron-down"></i>
            </button>

            <button
              className={`filter-btn ${activeDropdown === "rating" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown("rating");
              }}
            >
              <i className="fas fa-star"></i>
              Minimum Rating
              <i className="fas fa-chevron-down"></i>
            </button>

            <button
              className={`filter-btn ${activeDropdown === "subjects" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown("subjects");
              }}
            >
              <i className="fas fa-book-open"></i>
              Subjects
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>

          <div className="filter-info">
            <span className="tutor-count">
              {tutors.length} Tutors Available
            </span>
            {(selectedSubjects.length > 0 ||
              ratingFilter > 0 ||
              sortBy !== "relevance") && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Selected subjects (inside filter bar) */}
        {selectedSubjects.length > 0 && (
          <div className="filter-row-2">
            <div className="selected-subjects-container">
              {selectedSubjects.map((subject) => (
                <div key={subject} className="selected-subject-tag">
                  <span className="subject-name">{subject}</span>
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="remove-subject-btn"
                    title={`Remove ${subject} filter`}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DROPDOWN MENUS */}
        {activeDropdown === "sort" && (
          <div
            className="dropdown-menu sort-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <i className="fas fa-sort"></i>
              Sort By
              <span className="dropdown-subtitle">Choose sorting method</span>
            </div>
            <div className="dropdown-content">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`dropdown-option ${sortBy === option.value ? "active" : ""}`}
                  onClick={() => {
                    setSortBy(option.value);
                    setActiveDropdown(null);
                  }}
                >
                  <div className="option-icon">{getSortIcon(option.value)}</div>
                  <span className="option-label">{option.label}</span>
                  {sortBy === option.value && <i className="fas fa-check"></i>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeDropdown === "rating" && (
          <div
            className="dropdown-menu rating-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <i className="fas fa-star"></i>
              Minimum Rating
              <span className="dropdown-subtitle">Choose minimum stars</span>
            </div>
            <div className="dropdown-content">
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${ratingFilter >= star ? "active" : ""}`}
                    onClick={() => {
                      setRatingFilter(star);
                      setActiveDropdown(null);
                    }}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                ))}
              </div>
              <div className="rating-text">
                {ratingFilter === 0 ? "Any Rating" : `${ratingFilter}+ Stars`}
              </div>
            </div>
          </div>
        )}

        {activeDropdown === "subjects" && (
          <div
            className="dropdown-menu subjects-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <i className="fas fa-book-open"></i>
              Subjects
              <span className="dropdown-subtitle">Select one or more</span>
            </div>
            <div className="dropdown-content">
              <div className="subject-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  className="subject-search-input"
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                />
              </div>

              <div className="subjects-list">
                {filteredSubjects.map((subject) => (
                  <button
                    key={subject}
                    className={`subject-option ${selectedSubjects.includes(subject) ? "selected" : ""}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    <span>{subject}</span>
                    {selectedSubjects.includes(subject) && (
                      <i className="fas fa-check"></i>
                    )}
                  </button>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>

      <div className="results-header">
        <h3>
          {tutors.length} {tutors.length === 1 ? "Tutor" : "Tutors"} Available
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
          const pfpSrc = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;
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
                {user?.role === "student" &&
                  (() => {
                    const bookingValidation = canBookWithTutor(tutor);
                    return (
                      <div className="booking-section">
                        <button
                          className={`btn btn-sm btn-primary booking-btn ${!bookingValidation.canBook ? "disabled" : ""}`}
                          disabled={!bookingValidation.canBook}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (bookingValidation.canBook) {
                              console.log(
                                "🎯 FindTutors: Book Session button clicked for tutor:",
                                tutor.name,
                              );
                              setSelectedTutor(tutor);
                              setShowBookingStepper(true);
                              setBookingError(null);
                              console.log(
                                "✅ Booking stepper modal state updated - should be visible",
                              );
                            }
                          }}
                          title={
                            !bookingValidation.canBook
                              ? bookingValidation.reason
                              : "Book a session with this tutor"
                          }
                        >
                          <i className="fas fa-calendar-plus"></i>
                          Book Session
                        </button>
                        {!bookingValidation.canBook && (
                          <div className="booking-disabled-message">
                            <i className="fas fa-info-circle"></i>
                            <span>{bookingValidation.reason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

      {!isLoading && tutors.length >= PAGE_SIZE && tutors.length < totalTutors && (
        <div className="load-more-container">
          <button onClick={handleLoadMore} className="btn btn-primary">
            Load More Tutors ({tutors.length} of {totalTutors} shown)
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

      {/* Tutor Booking Modal */}
      {user?.role === "student" && selectedTutor && (
        <TutorBookingModal
          key="findtutors-modal"
          isOpen={showBookingStepper}
          onClose={() => {
            setShowBookingStepper(false);
            setSelectedTutor(null);
            setBookingError(null);
          }}
          currentUser={user}
          selectedTutor={selectedTutor}
          modalId="FindTutors"
        />
      )}
    </div>
  );
};

export default FindTutors;
