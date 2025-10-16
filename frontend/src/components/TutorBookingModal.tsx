import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Stepper, { Step } from "./Stepper";
import { useAuthStore } from "../store/authStore";
import {
  createBooking,
  getStudentByUserId,
  checkTutorAvailability,
} from "../services/bookingApi";
import type { Tutor } from "../types/Tutors";
import type { User } from "../types/Common";
import "./BookingStepperModal.css";

interface TutorBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedTutor: Tutor; // Required: tutor is pre-selected
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
  {
    id: 2,
    title: "Schedule Session",
    description: "Set date, time and details",
  },
  {
    id: 3,
    title: "Confirm Booking",
    description: "Review and confirm your session",
  },
];

const TutorBookingModal: React.FC<TutorBookingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedTutor,
  modalId = "unknown",
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    duration: 60,
    date: "",
    time: "",
    subject: "",
    notes: "",
    tutorId: selectedTutor.id,
    studentId: currentUser.id,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
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
      console.log("🔍 validateTutorAvailability called:", {
        tutorId,
        date,
        time,
        duration,
      });

      if (!tutorId || !date || !time) {
        console.log("❌ Validation skipped - missing required fields");
        setHasAvailabilityError(false);
        return true;
      }

      setIsCheckingAvailability(true);
      console.log("⏳ Checking availability...");

      try {
        const result = await checkTutorAvailability(
          tutorId,
          date,
          time,
          duration,
        );
        console.log("📋 Availability result:", result);

        if (!result.available) {
          // Show detailed conflict information
          let errorMessage =
            result.message || "Tutor is not available at this time";

          // Add more context based on conflict type
          if (result.conflictType === "student") {
            errorMessage = `❌ You already have another booking scheduled at this time. ${result.message}`;
          } else if (result.conflictType === "tutor") {
            errorMessage = `❌ Tutor is not available at this time. ${result.message}`;
          }

          console.log("❌ Availability conflict detected:", errorMessage);
          setError(errorMessage);
          setHasAvailabilityError(true);
          return false;
        } else {
          console.log("✅ Availability check passed - no conflicts");
          setError(null); // Clear any previous availability errors
          setHasAvailabilityError(false);
          return true;
        }
      } catch (err) {
        console.error("💥 Error checking availability:", err);
        setHasAvailabilityError(false);
        // Don't block the user if availability check fails
        return true;
      } finally {
        setIsCheckingAvailability(false);
        console.log("✅ Availability check completed");
      }
    },
    [],
  );

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
      setBookingData({
        duration: 60,
        date: "",
        time: "",
        subject: "",
        notes: "",
        tutorId: selectedTutor.id,
        studentId: currentUser.id,
      });
      setError(null);
      setHasAvailabilityError(false);
      setIsBookingSubmitted(false);
      setIsCheckingAvailability(false);
    }
  }, [isOpen, selectedTutor.id, currentUser.id]);

  const handleSubjectSelect = (subject: string) => {
    console.log("📚 SUBJECT SELECTED:", subject);
    setSelectedSubject(subject);
    setBookingData((prev) => ({ ...prev, subject }));
    console.log(
      "✅ Subject state updated, bookingData.subject should be:",
      subject,
    );

    // Clear any previous availability errors when selecting a new subject
    setHasAvailabilityError(false);
    setError(null);

    // Auto-advance to next step after a short delay
    setTimeout(() => {
      console.log("⏭️ Going to step 2 (booking form)");
      setCurrentStep(2);
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
    if (step === 3) {
      if (!bookingData.date || !bookingData.time) {
        setError("Please fill in all required fields before continuing.");
        return;
      }
      if (hasAvailabilityError) {
        setError("Please resolve the availability conflict before continuing.");
        return;
      }
    }

    // When going back to step 2 (booking form), reset booking data but keep subject and tutor
    if (step === 2 && currentStep === 3) {
      console.log("🔄 Going back to booking form - resetting booking data");
      setBookingData((prev) => ({
        ...prev,
        date: "",
        time: "",
        duration: 60,
        notes: "",
      }));
      setHasAvailabilityError(false);
      setError(null);
    }

    // When going back to step 1 (subject selection), reset subject and all availability state
    if (step === 1 && currentStep === 2) {
      console.log(
        "🔄 Going back to subject selection - resetting subject and availability state",
      );
      setSelectedSubject("");
      setBookingData((prev) => ({
        ...prev,
        subject: "",
        date: "",
        time: "",
        duration: 60,
        notes: "",
      }));
      setHasAvailabilityError(false);
      setError(null);
    }

    setCurrentStep(step);
  };

  const handleFinalStepCompleted = () => {
    onClose();
  };

  // Check if a step is clickable based on validation
  const isStepClickable = (step: number) => {
    if (step === 1) return true; // Always allow going back to step 1
    if (step === 2) return !!selectedSubject; // Need subject selected
    if (step === 3)
      return (
        !!selectedSubject &&
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
          backButtonText="Previous"
          nextButtonText="Continue"
          stepCircleContainerClassName="booking-stepper-container"
          contentClassName="booking-stepper-content"
          footerClassName="booking-stepper-footer"
          renderStepIndicator={renderStepIndicator}
          canProceedToNext={(step) => {
            if (step === 1) return !!selectedSubject; // Need subject selection
            if (step === 2) {
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
            if (step === 2) {
              // Disable if missing date/time OR has availability conflicts
              const missingFields = !(bookingData.date && bookingData.time);
              const hasConflicts =
                hasAvailabilityError || isCheckingAvailability;
              const isDisabled = missingFields || hasConflicts;

              console.log("🔘 Button state check:", {
                step,
                missingFields,
                hasAvailabilityError,
                isCheckingAvailability,
                hasConflicts,
                isDisabled,
                date: bookingData.date,
                time: bookingData.time,
              });

              return isDisabled;
            }
            return false;
          }}
        >
          <Step>
            <SubjectSelectionStep
              subjects={selectedTutor.subjects}
              onSubjectSelect={handleSubjectSelect}
              selectedTutor={selectedTutor}
              currentUser={currentUser}
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
              onPrevious={() => setCurrentStep(2)}
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
  selectedTutor: Tutor;
  currentUser: User;
}> = ({ subjects, onSubjectSelect, selectedTutor, currentUser }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="subject-selection-step"
    >
      <h3>Book A Session!</h3>
      <p>
        Select a subject that {selectedTutor.name} {selectedTutor.surname}{" "}
        teaches
      </p>

      <div className="subjects-grid-container">
        <div className="subjects-grid">
          {subjects.map((subject, index) => {
            // Check if user is enrolled in this subject
            const userEnrolledCourses =
              (currentUser as any).enrolledCourses || [];
            const isEnrolled = userEnrolledCourses.includes(subject);

            return (
              <motion.div
                key={subject}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: isEnrolled ? 0.98 : 1 }}
                className={`subject-card ${!isEnrolled ? "disabled" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isEnrolled) {
                    console.log("Card clicked:", subject);
                    onSubjectSelect(subject);
                  } else {
                    console.log("Subject not enrolled:", subject);
                  }
                }}
                style={{
                  cursor: isEnrolled ? "pointer" : "not-allowed",
                  opacity: isEnrolled ? 1 : 0.6,
                }}
              >
                <div className="subject-icon">
                  <i className="fas fa-book-open"></i>
                </div>
                <div className="subject-card-content">
                  <h4>{subject}</h4>
                  {!isEnrolled ? (
                    <p className="not-enrolled-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      Not enrolled - Update your profile to include this subject
                    </p>
                  ) : (
                    <p>
                      Taught by {selectedTutor.name} {selectedTutor.surname}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
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
  selectedTutor: Tutor;
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
  // Re-validate availability when component mounts with existing date/time data
  useEffect(() => {
    if (selectedTutor && bookingData.date && bookingData.time) {
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        validateTutorAvailability(
          selectedTutor.id,
          bookingData.date!,
          bookingData.time!,
          bookingData.duration || 60,
        );
      }, 300);
    }
  }, [selectedTutor, validateTutorAvailability]); // Only run when tutor changes, not on every render

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
        // Always validate availability, even if values are the same
        // This ensures validation runs when user goes back and sets same conflicting time
        setTimeout(() => {
          validateTutorAvailability(
            selectedTutor.id,
            newDate,
            newTime,
            newDuration,
          );
        }, 100); // Reduced delay for better responsiveness
      }
    }
  };

  const handleConfirmBooking = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Move to step 3 (confirmation) instead of submitting immediately
    setCurrentStep(3);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
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
              onChange={(e) => handleInputChange("date", e.target.value)}
              onBlur={() => {
                // Re-validate when user leaves the date field
                if (selectedTutor && bookingData.date && bookingData.time) {
                  validateTutorAvailability(
                    selectedTutor.id,
                    bookingData.date,
                    bookingData.time,
                    bookingData.duration || 60,
                  );
                }
              }}
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
                // Validate time range
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
                    return;
                  }
                }
                
                // Re-validate availability when user leaves the time field
                if (selectedTutor && bookingData.date && bookingData.time) {
                  validateTutorAvailability(
                    selectedTutor.id,
                    bookingData.date,
                    bookingData.time,
                    bookingData.duration || 60,
                  );
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
  selectedTutor: Tutor;
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
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

      <div className="form-actions">
        {!isBookingSubmitted ? (
          <>
            <button
              type="button"
              onClick={onPrevious}
              className="btn-secondary"
            >
              <i className="fas fa-arrow-left"></i>
              Previous
            </button>
            <button type="button" onClick={onSubmit} className="btn-primary">
              <i className="fas fa-calendar-plus"></i>
              Book Session
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            <i className="fas fa-check"></i>
            Complete
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default TutorBookingModal;
