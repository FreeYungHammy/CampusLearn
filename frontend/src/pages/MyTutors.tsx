import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getMySubscribedTutors,
  unsubscribeFromTutor,
} from "../services/subscriptionApi";
import { useAuthStore } from "../store/authStore";
import type { Tutor } from "../types/Tutors";
import UnsubscribeConfirmationModal from "../components/UnsubscribeConfirmationModal";
import TutorBookingModal from "../components/TutorBookingModal";
import AnimatedList from "../components/AnimatedList";
import PageHeader from "../components/PageHeader";

const MyTutors = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  
  // Booking-related state
  const [showBookingStepper, setShowBookingStepper] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  // Filter and Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState("name");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Advanced Filter State
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");

  // Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const { user, token, pfpTimestamps } = useAuthStore();

  // Filter options
  const ratingOptions = [
    { value: 0, label: "All Ratings" },
    { value: 2, label: "+2 Stars" },
    { value: 3, label: "+3 Stars" },
    { value: 4, label: "+4 Stars" },
    { value: 4.5, label: "+4.5 Stars" },
  ];

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "rating", label: "Rating" },
    { value: "subjects", label: "Subjects" },
  ];

  // Helper functions for icons
  const getSortIcon = (sortValue: string) => {
    const iconMap: { [key: string]: string } = {
      name: "fas fa-user",
      rating: "fas fa-star",
      subjects: "fas fa-book",
    };
    return <i className={iconMap[sortValue] || "fas fa-sort"}></i>;
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

  // Helper function to check if tutor subjects match student enrolled courses
  const canBookWithTutor = (tutor: Tutor): { canBook: boolean; reason?: string } => {
    if (user?.role !== 'student') {
      return { canBook: false, reason: 'Only students can book sessions' };
    }

    const studentCourses = (user as any).enrolledCourses || [];
    if (studentCourses.length === 0) {
      return { canBook: false, reason: 'Please update your profile to include your enrolled courses' };
    }

    // Check if any tutor subject matches any student enrolled course
    const hasMatchingSubject = tutor.subjects.some(subject => 
      studentCourses.includes(subject)
    );

    if (!hasMatchingSubject) {
      return { 
        canBook: false, 
        reason: 'This tutor teaches subjects you are not enrolled in. Please update your profile to include the required subjects.' 
      };
    }

    return { canBook: true };
  };

  const handleUnsubscribe = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowUnsubscribeModal(true);
  };

  const handleConfirmUnsubscribe = async () => {
    if (!token || !selectedTutor) return;
    try {
      await unsubscribeFromTutor(selectedTutor.id);
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

  // Filter and sort tutors
  useEffect(() => {
    let filtered = [...tutors];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(tutor =>
        `${tutor.name} ${tutor.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply subject filter
    if (selectedSubjects.length > 0) {
      filtered = filtered.filter(tutor =>
        selectedSubjects.some(subject => tutor.subjects.includes(subject))
      );
    }

    // Apply rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(tutor => {
        const avgRating = tutor.rating.count > 0 ? tutor.rating.totalScore / tutor.rating.count : 0;
        return avgRating >= ratingFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`);
        case "rating":
          const ratingA = a.rating.count > 0 ? a.rating.totalScore / a.rating.count : 0;
          const ratingB = b.rating.count > 0 ? b.rating.totalScore / b.rating.count : 0;
          return ratingB - ratingA;
        case "subjects":
          return b.subjects.length - a.subjects.length;
        default:
          return 0;
      }
    });

    setFilteredTutors(filtered);
  }, [tutors, searchQuery, selectedSubjects, ratingFilter, sortBy]);

  // Extract available subjects
  useEffect(() => {
    const subjects = new Set<string>();
    tutors.forEach(tutor => {
      tutor.subjects.forEach(subject => subjects.add(subject));
    });
    setAvailableSubjects(Array.from(subjects));
  }, [tutors]);

  useEffect(() => {
    const fetchSubscribedTutors = async () => {
      if (!user || !token) return;
      try {
        setIsLoading(true);
        const response = await getMySubscribedTutors(user.id);
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
      <PageHeader
        title="My Tutors"
        subtitle="Manage your subscribed tutors and book sessions"
        icon="fas fa-user-friends"
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
              {filteredTutors.length} Tutors Available
            </span>
            {(selectedSubjects.length > 0 ||
              ratingFilter > 0 ||
              sortBy !== "name") && (
              <button className="clear-filters-btn" onClick={() => {
                setSelectedSubjects([]);
                setRatingFilter(0);
                setSortBy("name");
              }}>
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
                    onClick={() => setSelectedSubjects(prev => prev.filter(s => s !== subject))}
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
                {availableSubjects.filter(subject => 
                  subject.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                ).map((subject) => (
                  <button
                    key={subject}
                    className={`subject-option ${selectedSubjects.includes(subject) ? "selected" : ""}`}
                    onClick={() => setSelectedSubjects(prev => 
                      prev.includes(subject) 
                        ? prev.filter(s => s !== subject)
                        : [...prev, subject]
                    )}
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
          {filteredTutors.map((tutor) => {
            const pfpSrc = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;

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
                  {user?.role === 'student' && (() => {
                    const bookingValidation = canBookWithTutor(tutor);
                    return (
                      <div className="booking-section">
                        <button
                          className={`btn btn-sm btn-primary booking-btn ${!bookingValidation.canBook ? 'disabled' : ''}`}
                          disabled={!bookingValidation.canBook}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (bookingValidation.canBook) {
                              console.log('🎯 MyTutors: Book Session button clicked for tutor:', tutor.name);
                              setSelectedTutor(tutor);
                              setShowBookingStepper(true);
                              setBookingError(null);
                              console.log('✅ Booking stepper modal state updated - should be visible');
                            }
                          }}
                          title={!bookingValidation.canBook ? bookingValidation.reason : 'Book a session with this tutor'}
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

      {/* Tutor Booking Modal */}
        {user?.role === 'student' && selectedTutor && (
          <TutorBookingModal
            key="mytutors-modal"
            isOpen={showBookingStepper}
            onClose={() => {
              setShowBookingStepper(false);
              setSelectedTutor(null);
              setBookingError(null);
            }}
            currentUser={user}
            selectedTutor={selectedTutor}
            modalId="MyTutors"
          />
        )}
    </div>
  );
};

export default MyTutors;
