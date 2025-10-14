import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Stepper, { Step } from "./Stepper";
import { useAuthStore } from "../store/authStore";
import { getMySubscribedTutors } from "../services/subscriptionApi";
import {
  createBooking,
  getStudentByUserId,
  checkTutorAvailability,
} from "../services/bookingApi";
import type { Tutor } from "../types/Tutors";
import type { User } from "../types/Common";
import "./BookingStepperModal.css";

interface BookingStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedTutor?: Tutor; // Optional: if provided, skip tutor selection step
  modalId?: string; // Optional: unique identifier for debugging
}

interface BookingData {
  date: string;
  time: string;
  duration: number;
  subject: string;
  notes?: string;
  tutorId: string;
  studentId: string;
}

const steps = [
  {
    id: 1,
    title: "Select Subject",
    description: "Choose what you want to learn",
  },
  { id: 2, title: "Pick Tutor", description: "Select your preferred tutor" },
  {
    id: 3,
    title: "Schedule Session",
    description: "Set date, time and details",
  },
  {
    id: 4,
    title: "Confirm Booking",
    description: "Review and confirm your session",
  },
];

const BookingStepperModal: React.FC<BookingStepperModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedTutor: preSelectedTutor,
  modalId = "unknown",
}) => {
  const [subscribedTutors, setSubscribedTutors] = useState<Tutor[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  // Debug selectedTutor changes
  useEffect(() => {
    console.log("🔄 selectedTutor changed to:", selectedTutor?.name || "null");
  }, [selectedTutor]);

  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    duration: 60,
    date: "",
    time: "",
    subject: "",
    notes: "",
    tutorId: "",
    studentId: currentUser.id,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBookingSubmitted, setIsBookingSubmitted] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [hasAvailabilityError, setHasAvailabilityError] = useState(false);

  const { pfpTimestamps } = useAuthStore();

  // Check tutor availability with duration-based conflict detection
  const validateTutorAvailability = useCallback(
    async (
      tutorId: string,
      date: string,
      time: string,
      duration: number = 60,
    ) => {
      if (!tutorId || !date || !time) {
        setHasAvailabilityError(false);
        return true;
      }

      setIsCheckingAvailability(true);
      try {
        const result = await checkTutorAvailability(
          tutorId,
          date,
          time,
          duration,
        );
        if (!result.available) {
          // Show detailed conflict information
          let errorMessage =
            result.message || "Tutor is not available at this time";
          if (result.conflictingBooking) {
            errorMessage += ` (Existing booking: ${result.conflictingBooking.time}-${result.conflictingBooking.endTime})`;
          }
          setError(errorMessage);
          setHasAvailabilityError(true);
          return false;
        } else {
          setError(null); // Clear any previous availability errors
          setHasAvailabilityError(false);
          return true;
        }
      } catch (err) {
        console.error("Error checking availability:", err);
        setHasAvailabilityError(false);
        // Don't block the user if availability check fails
        return true;
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [],
  );

  const loadSubscribedTutors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMySubscribedTutors(currentUser.id);
      setSubscribedTutors(response.data);
    } catch (err: any) {
      console.error("Failed to load subscribed tutors:", err);
      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please refresh the page and log in again.",
        );
      } else {
        setError("Failed to load your subscribed tutors. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (isOpen && currentUser && !preSelectedTutor) {
      // Load subscribed tutors for normal flow
      loadSubscribedTutors();
    }
  }, [isOpen, currentUser, loadSubscribedTutors]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset entire flow when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state to initial values
      setCurrentStep(1);
      setSelectedSubject("");
      setSelectedTutor(null);
      setFilteredTutors([]);
      setBookingData({
        duration: 60,
        date: "",
        time: "",
        subject: "",
        notes: "",
        tutorId: "",
        studentId: currentUser.id,
      });
      setError(null);
      setHasAvailabilityError(false);
      setIsBookingSubmitted(false);
      setIsCheckingAvailability(false);
      setIsInitialized(false);
    }
  }, [isOpen, currentUser.id]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      // Handle pre-selected tutor case
      if (preSelectedTutor) {
        setSelectedTutor(preSelectedTutor);
        setBookingData((prev) => ({ ...prev, tutorId: preSelectedTutor.id }));
        setAvailableSubjects(preSelectedTutor.subjects);
        // Don't skip to step 3 - always start with subject selection
        setCurrentStep(1);
      }
      setIsInitialized(true);
    }
  }, [isOpen, currentUser.id, isInitialized, preSelectedTutor]);

  useEffect(() => {
    if (subscribedTutors.length > 0) {
      // Extract unique subjects from all tutors
      const subjects = [
        ...new Set(subscribedTutors.flatMap((tutor) => tutor.subjects)),
      ];
      setAvailableSubjects(subjects);
    }
  }, [subscribedTutors]);

  useEffect(() => {
    if (selectedSubject) {
      // Filter tutors by selected subject
      const filtered = subscribedTutors.filter((tutor) =>
        tutor.subjects.includes(selectedSubject),
      );
      setFilteredTutors(filtered);
    }
  }, [selectedSubject, subscribedTutors]);

  const handleSubjectSelect = (subject: string) => {
    console.log("📚 SUBJECT SELECTED:", subject);
    setSelectedSubject(subject);
    setBookingData((prev) => ({ ...prev, subject }));
    console.log(
      "✅ Subject state updated, bookingData.subject should be:",
      subject,
    );

    // Auto-advance to next step after a short delay
    // If tutor is pre-selected, skip step 2 and go directly to step 3
    setTimeout(() => {
      if (preSelectedTutor) {
        console.log("⏭️ Skipping to step 3 (pre-selected tutor)");
        setCurrentStep(3); // Skip tutor selection since tutor is already chosen
      } else {
        console.log("⏭️ Going to step 2 (tutor selection)");
        setCurrentStep(2); // Go to tutor selection
      }
    }, 300);
  };

  const handleTutorSelect = (tutor: Tutor) => {
    console.log("🎯 TUTOR SELECTED:", tutor.name, "ID:", tutor.id);
    setSelectedTutor(tutor);
    setBookingData((prev) => ({ ...prev, tutorId: tutor.id }));
    console.log("✅ Tutor state should be set");

    // Auto-advance to next step after a short delay
    setTimeout(() => {
      console.log("⏭️ Advancing to step 3");
      setCurrentStep(3);
    }, 300);
  };

  const handleBookingSubmit = async () => {
    console.log("🚀 BOOKING SUBMIT CALLED");
    console.log("📋 bookingData:", bookingData);
    console.log("👨‍🏫 selectedTutor:", selectedTutor);
    console.log("📚 selectedSubject:", selectedSubject);

    if (!bookingData.date || !bookingData.time || !selectedTutor) {
      console.log("❌ VALIDATION FAILED - missing fields");
      console.log("  - date:", bookingData.date);
      console.log("  - time:", bookingData.time);
      console.log("  - selectedTutor:", selectedTutor);
      setError("Please fill in all required fields.");
      return;
    }

    try {
      console.log("✅ VALIDATION PASSED - proceeding with booking");

      // Get the student ID from the user ID
      const student = await getStudentByUserId(currentUser.id);
      console.log("👨‍🎓 Student found:", student);

      // Create the booking with all required data
      const finalBookingData = {
        studentId: student.id,
        tutorId: selectedTutor.id,
        subject: selectedSubject,
        date: bookingData.date,
        time: bookingData.time,
        duration: bookingData.duration || 60,
        notes: bookingData.notes || "",
        initiatedBy: "student" as const,
      };

      console.log("📤 FINAL BOOKING DATA TO SEND:", finalBookingData);

      // Call the API directly
      console.log("📡 CALLING API with booking data...");
      const newBooking = await createBooking(finalBookingData);
      console.log("✅ BOOKING CREATED SUCCESSFULLY:", newBooking);

      // Set booking as submitted
      console.log("🎉 BOOKING SUBMITTED - setting state to true");
      setIsBookingSubmitted(true);

      // Force a small delay to ensure state update
      setTimeout(() => {
        console.log("🎉 BOOKING SUBMITTED - state should be updated now");
      }, 100);
    } catch (err) {
      console.error("💥 BOOKING FAILED:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create booking.",
      );
    }
  };

  const handleStepChange = (step: number) => {
    // Validate before allowing step changes
    if (step === 2 && !selectedSubject) {
      setError("Please select a subject before continuing.");
      return;
    }
    if (step === 3 && !selectedTutor) {
      setError("Please select a tutor before continuing.");
      return;
    }
    if (step === 4) {
      if (!bookingData.date || !bookingData.time) {
        setError("Please fill in all required fields before continuing.");
        return;
      }
      if (hasAvailabilityError) {
        setError("Please resolve the availability conflict before continuing.");
        return;
      }
    }

    setCurrentStep(step);
    setError(null);
  };

  const handleFinalStepCompleted = () => {
    onClose();
  };

  // Check if a step is clickable based on validation
  const isStepClickable = (step: number) => {
    if (step === 1) return true; // Always allow going back to step 1
    if (step === 2) return !!selectedSubject; // Need subject selected
    if (step === 3) return !!selectedSubject && !!selectedTutor; // Need both subject and tutor
    if (step === 4)
      return (
        !!selectedSubject &&
        !!selectedTutor &&
        !!bookingData.date &&
        !!bookingData.time &&
        !hasAvailabilityError
      );
    return true;
  };

  const getPfpSrc = (tutor: Tutor) => {
    return `/api/users/${tutor.userId}/pfp?t=${pfpTimestamps[tutor.userId] || 0}`;
  };

  // Custom step indicator that respects validation
  const renderStepIndicator = ({
    step,
    currentStep,
    onStepClick,
  }: {
    step: number;
    currentStep: number;
    onStepClick: (step: number) => void;
  }) => {
    const isClickable = isStepClickable(step);
    const status =
      currentStep === step
        ? "active"
        : currentStep < step
          ? "inactive"
          : "complete";

    const handleClick = () => {
      if (isClickable && step !== currentStep) {
        onStepClick(step);
      }
    };

    return (
      <div
        className={`step-indicator ${!isClickable ? "disabled" : ""}`}
        onClick={handleClick}
        style={{
          cursor: isClickable && step !== currentStep ? "pointer" : "default",
          opacity: !isClickable ? 0.5 : 1,
        }}
      >
        <div className={`step-indicator-inner ${status}`}>
          {status === "complete" ? (
            <i className="fas fa-check check-icon"></i>
          ) : status === "active" ? (
            <div className="active-dot"></div>
          ) : (
            <span className="step-number">{step}</span>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="booking-stepper-overlay" onClick={onClose}>
      <div
        className="booking-stepper-overlay-container"
        onClick={(e) => e.stopPropagation()}
      >
        <Stepper
          initialStep={1}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          onFinalStepCompleted={onClose}
          onCancel={currentStep === 4 ? handleBookingSubmit : undefined}
          backButtonText="Previous"
          nextButtonText={
            currentStep === 4
              ? isBookingSubmitted
                ? "Complete"
                : "Book Session"
              : "Continue"
          }
          stepCircleContainerClassName="booking-stepper-container"
          contentClassName="booking-stepper-content"
          footerClassName={
            currentStep === 4
              ? "booking-stepper-footer hidden"
              : "booking-stepper-footer"
          }
          renderStepIndicator={renderStepIndicator}
          canProceedToNext={(step) => {
            if (step === 1) return !!selectedSubject; // Need subject selection
            if (step === 2) return selectedTutor !== null; // Need tutor selection
            if (step === 3) {
              // Need date, time, AND no availability conflicts
              const hasRequiredFields = !!(
                bookingData.date && bookingData.time
              );
              const hasNoConflicts =
                !hasAvailabilityError && !isCheckingAvailability;
              return hasRequiredFields && hasNoConflicts;
            }
            return true;
          }}
          isNextButtonDisabled={(step) => {
            if (step === 1) return !selectedSubject; // Disable if no subject selected
            if (step === 2) return selectedTutor === null; // Disable if no tutor selected
            if (step === 3) {
              // Disable if missing date/time OR has availability conflicts
              const missingFields = !(bookingData.date && bookingData.time);
              const hasConflicts =
                hasAvailabilityError || isCheckingAvailability;
              return missingFields || hasConflicts;
            }
            return false;
          }}
        >
          <Step>
            <SubjectSelectionStep
              subjects={
                preSelectedTutor ? preSelectedTutor.subjects : availableSubjects
              }
              onSubjectSelect={handleSubjectSelect}
              isLoading={isLoading}
              subscribedTutors={subscribedTutors}
              onClose={onClose}
              preSelectedTutor={preSelectedTutor}
            />
          </Step>

          <Step>
            <TutorSelectionStep
              tutors={filteredTutors}
              selectedSubject={selectedSubject}
              onTutorSelect={handleTutorSelect}
              getPfpSrc={getPfpSrc}
              selectedTutor={selectedTutor}
              error={error}
            />
          </Step>

          <Step>
            <BookingFormStep
              bookingData={bookingData}
              setBookingData={setBookingData}
              selectedTutor={selectedTutor}
              error={error}
              onSubmit={handleBookingSubmit}
              validateTutorAvailability={validateTutorAvailability}
              isCheckingAvailability={isCheckingAvailability}
              setCurrentStep={setCurrentStep}
              setHasAvailabilityError={setHasAvailabilityError}
              setError={setError}
            />
          </Step>

          <Step>
            <ConfirmationStep
              bookingData={bookingData}
              selectedTutor={selectedTutor}
              selectedSubject={selectedSubject}
              onSubmit={handleBookingSubmit}
              onClose={onClose}
              onPrevious={() => setCurrentStep(3)}
              isBookingSubmitted={isBookingSubmitted}
            />
          </Step>
        </Stepper>
      </div>
    </div>
  );
};

// Step Components
const SubjectSelectionStep: React.FC<{
  subjects: string[];
  onSubjectSelect: (subject: string) => void;
  isLoading: boolean;
  subscribedTutors: Tutor[];
  onClose: () => void;
  preSelectedTutor?: Tutor;
}> = ({
  subjects,
  onSubjectSelect,
  isLoading,
  subscribedTutors,
  onClose,
  preSelectedTutor,
}) => {
  if (isLoading) {
    return (
      <div className="step-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading subjects...</span>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="step-empty">
        <i className="fas fa-book"></i>
        <h3>No Subjects Available</h3>
        <p>
          You haven't subscribed to any tutors yet. Visit Find Tutors to
          discover and subscribe to tutors.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="subject-selection-step"
    >
      <h3>Book A Session!</h3>
      {preSelectedTutor ? (
        <p>
          Select a subject that {preSelectedTutor.name}{" "}
          {preSelectedTutor.surname} teaches
        </p>
      ) : (
        <p>Select a subject to see available tutors</p>
      )}

      <div className="subjects-grid-container">
        <div className="subjects-grid">
          {subjects.map((subject, index) => (
            <motion.div
              key={subject}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              className="subject-card"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Card clicked:", subject);
                onSubjectSelect(subject);
              }}
            >
              <div className="subject-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <div className="subject-card-content">
                <h4>{subject}</h4>
                {preSelectedTutor ? (
                  <p>
                    Taught by {preSelectedTutor.name} {preSelectedTutor.surname}
                  </p>
                ) : (
                  <p>
                    Available tutors:{" "}
                    {
                      subscribedTutors.filter((tutor) =>
                        tutor.subjects.includes(subject),
                      ).length
                    }
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const TutorSelectionStep: React.FC<{
  tutors: Tutor[];
  selectedSubject: string;
  onTutorSelect: (tutor: Tutor) => void;
  getPfpSrc: (tutor: Tutor) => string;
  selectedTutor: Tutor | null;
  error: string | null;
}> = ({
  tutors,
  selectedSubject,
  onTutorSelect,
  getPfpSrc,
  selectedTutor,
  error,
}) => {
  console.log(
    "🎭 TutorSelectionStep rendered with selectedTutor:",
    selectedTutor?.name || "null",
  );

  if (tutors.length === 0) {
    return (
      <div className="step-empty">
        <i className="fas fa-user-graduate"></i>
        <h3>No Tutors Available</h3>
        <p>
          No tutors available for {selectedSubject}. Try selecting a different
          subject.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="tutor-selection-step"
    >
      <h3>Choose your tutor for {selectedSubject}</h3>
      <p>Select a tutor to schedule your session</p>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <div className="tutors-grid">
        {tutors.map((tutor, index) => {
          const avgRating =
            tutor.rating.count > 0
              ? (tutor.rating.totalScore / tutor.rating.count).toFixed(1)
              : "Unrated";

          return (
            <motion.div
              key={tutor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.95 }}
              className={`tutor-character-card ${selectedTutor?.id === tutor.id ? "selected" : ""}`}
              onClick={() => onTutorSelect(tutor)}
            >
              <div className="tutor-avatar-container">
                <div className="tutor-avatar">
                  <img
                    src={getPfpSrc(tutor)}
                    alt={`${tutor.name} ${tutor.surname}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://via.placeholder.com/80x80/3498db/ffffff?text=" +
                        (tutor.name?.charAt(0) || "U");
                    }}
                  />
                </div>
              </div>

              <div className="tutor-info">
                <h4 className="tutor-name">
                  {tutor.name} {tutor.surname}
                </h4>
                <div className="tutor-rating">
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`fas fa-star ${star <= (tutor.rating.count > 0 ? Math.round(tutor.rating.totalScore / tutor.rating.count) : 0) ? "filled" : ""}`}
                      ></i>
                    ))}
                  </div>
                  <span className="rating-text">
                    {avgRating} ({tutor.rating.count})
                  </span>
                </div>

                <div className="tutor-specialties">
                  <span className="specialty-tag selected">
                    {selectedSubject}
                  </span>
                </div>
              </div>

              <div className="tutor-action">
                <i className="fas fa-chevron-right"></i>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const BookingFormStep: React.FC<{
  bookingData: Partial<BookingData>;
  setBookingData: (
    data:
      | Partial<BookingData>
      | ((prev: Partial<BookingData>) => Partial<BookingData>),
  ) => void;
  selectedTutor: Tutor | null;
  error: string | null;
  onSubmit: () => void;
  validateTutorAvailability: (
    tutorId: string,
    date: string,
    time: string,
    duration?: number,
  ) => Promise<boolean>;
  isCheckingAvailability: boolean;
  setCurrentStep: (step: number) => void;
  setHasAvailabilityError: (hasError: boolean) => void;
  setError: (error: string | null) => void;
}> = ({
  bookingData,
  setBookingData,
  selectedTutor,
  error,
  onSubmit,
  validateTutorAvailability,
  isCheckingAvailability,
  setCurrentStep,
  setHasAvailabilityError,
  setError,
}) => {
  const handleInputChange = async (field: string, value: any) => {
    // Validate time input for 08:00-17:00 restriction
    if (field === 'time' && value) {
      const [hours, minutes] = value.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      const minMinutes = 8 * 60; // 08:00
      const maxMinutes = 17 * 60; // 17:00
      
      if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        setError('Booking times must be between 08:00 and 17:00');
        return;
      }
    }
    setBookingData((prev: Partial<BookingData>) => ({ ...prev, [field]: value }));
    

    // Reset availability error when user changes fields
    if (field === "date" || field === "time" || field === "duration") {
      setHasAvailabilityError(false);
      setError(null);
    }

    // Validate availability when date, time, or duration changes
    if (
      (field === "date" || field === "time" || field === "duration") &&
      selectedTutor
    ) {
      const newDate = field === "date" ? value : bookingData.date;
      const newTime = field === "time" ? value : bookingData.time;
      const newDuration =
        field === "duration" ? value : bookingData.duration || 60;

      if (newDate && newTime) {
        // Validate availability with a small delay to avoid too many API calls
        setTimeout(() => {
          validateTutorAvailability(
            selectedTutor.id,
            newDate,
            newTime,
            newDuration,
          );
        }, 500);
      }
    }
  };

  const handleConfirmBooking = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Move to step 4 (confirmation) instead of submitting immediately
    setCurrentStep(4);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="booking-form-step"
    >
      <h3>Schedule Your Session</h3>
      <p>
        Book a session with {selectedTutor?.name} {selectedTutor?.surname}
      </p>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {isCheckingAvailability && (
        <div className="info-message">
          <i className="fas fa-spinner fa-spin"></i>
          Checking tutor availability...
        </div>
      )}

      <div className="booking-form">
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={bookingData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              min={(() => {
                const today = new Date();
                const oneWeekFromNow = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
                oneWeekFromNow.setHours(0, 0, 0, 0);
                return oneWeekFromNow.toISOString().split('T')[0];
              })()}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Time</label>
            <input
              type="time"
              value={bookingData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              onBlur={(e) => {
                const time = e.target.value;
                if (time) {
                  const [hours, minutes] = time.split(':').map(Number);
                  const totalMinutes = hours * 60 + minutes;
                  const minMinutes = 8 * 60; // 08:00
                  const maxMinutes = 17 * 60; // 17:00
                  
                  if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
                    setError('Booking times must be between 08:00 and 17:00');
                    e.target.value = ''; // Clear invalid time
                    setBookingData(prev => ({ ...prev, time: '' }));
                  }
                }
              }}
              min="08:00"
              max="17:00"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <select
            value={bookingData.duration}
            onChange={(e) =>
              handleInputChange("duration", parseInt(e.target.value))
            }
            className="form-input"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            value={bookingData.notes || ""}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Any specific topics or questions?"
            className="form-textarea"
            rows={3}
          />
        </div>
      </div>
    </motion.div>
  );
};

const ConfirmationStep: React.FC<{
  bookingData: Partial<BookingData>;
  selectedTutor: Tutor | null;
  selectedSubject: string;
  onSubmit: () => void;
  onClose: () => void;
  onPrevious: () => void;
  isBookingSubmitted?: boolean;
}> = ({
  bookingData,
  selectedTutor,
  selectedSubject,
  onSubmit,
  onClose,
  onPrevious,
  isBookingSubmitted = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="confirmation-step"
    >
      <div className={isBookingSubmitted ? "success-icon" : "preview-icon"}>
        <i
          className={isBookingSubmitted ? "fas fa-check-circle" : "fas fa-eye"}
        ></i>
      </div>

      <h3>
        {isBookingSubmitted ? "Booking Confirmed!" : "Review Your Booking"}
      </h3>
      <p>
        {isBookingSubmitted
          ? "Your session has been successfully scheduled."
          : "Please review your booking details and confirm to schedule your session."}
      </p>

      <div className="booking-summary">
        <div className="summary-item">
          <i className="fas fa-user"></i>
          <span>
            Tutor: {selectedTutor?.name} {selectedTutor?.surname}
          </span>
        </div>
        <div className="summary-item">
          <i className="fas fa-book"></i>
          <span>Subject: {selectedSubject}</span>
        </div>
        <div className="summary-item">
          <i className="fas fa-calendar"></i>
          <span>Date: {bookingData.date}</span>
        </div>
        <div className="summary-item">
          <i className="fas fa-clock"></i>
          <span>Time: {bookingData.time}</span>
        </div>
        <div className="summary-item">
          <i className="fas fa-hourglass-half"></i>
          <span>Duration: {bookingData.duration} minutes</span>
        </div>
      </div>

      <div className="modal-actions">
        {!isBookingSubmitted ? (
          <>
            <button
              type="button"
              onClick={onPrevious}
              className="btn-secondary"
            >
              Previous
            </button>
            <button type="button" onClick={onSubmit} className="btn-primary">
              <i className="fas fa-calendar-plus"></i>
              Book Session
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="btn-primary">
            <i className="fas fa-check"></i>
            Complete
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default BookingStepperModal;
