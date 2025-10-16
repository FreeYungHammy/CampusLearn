import React, { useState, useEffect } from "react";
import Dialog from "./ui/Dialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { User } from "../types/Common";
import { getStudentByUserId } from "../services/bookingApi";

interface EnhancedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingData: BookingData) => Promise<void>;
  targetUser: {
    id: string;
    name?: string;
    surname?: string;
    role: 'student' | 'tutor';
    subjects?: string[];
  };
  currentUser: User;
}

export interface BookingData {
  date: string;
  time: string;
  duration: number; // in minutes
  subject: string;
  notes?: string;
}

export default function EnhancedBookingModal({
  isOpen,
  onClose,
  onConfirm,
  targetUser,
  currentUser
}: EnhancedBookingModalProps) {
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [formData, setFormData] = useState<BookingData>({
    date: '',
    time: '',
    duration: 60,
    subject: '',
    notes: ''
  });

  // Fetch enrolled courses when modal opens
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!isOpen) return;
      
      setIsLoadingCourses(true);
      try {
        // Calculate booking type inside useEffect
        const isStudentBookingTutor = currentUser.role === 'student' && targetUser.role === 'tutor';
        
        // Determine which user's enrolled courses to fetch
        const userIdToFetch = isStudentBookingTutor ? currentUser.id : targetUser.id;
        console.log('🔍 Fetching enrolled courses for user:', userIdToFetch);
        console.log('🔍 Booking type:', isStudentBookingTutor ? 'Student booking tutor' : 'Tutor booking student');
        
        const student = await getStudentByUserId(userIdToFetch);
        console.log('📚 Student data received:', student);
        
        if (student && student.enrolledCourses) {
          setEnrolledCourses(student.enrolledCourses);
          console.log('✅ Enrolled courses set:', student.enrolledCourses);
        } else {
          console.log('⚠️ No enrolled courses found in student data');
          setEnrolledCourses([]);
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch enrolled courses:', error);
        
        // If 404 error, it means student profile doesn't exist
        if (error.response?.status === 404) {
          console.log('👤 Student profile not found - user may need to create profile');
          setEnrolledCourses([]);
        } else {
          setEnrolledCourses([]);
        }
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchEnrolledCourses();
  }, [isOpen, currentUser.id, currentUser.role, targetUser.id, targetUser.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    
    // Enhanced validation
    if (!selectedDate || !selectedTime || !formData.subject.trim()) {
      alert('Please fill in all required fields (Date, Time, and Subject)');
      return;
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      alert('Please select a date in the future');
      return;
    }

    // Validate time is not in the past if date is today
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      
      if (selectedDateTime <= now) {
        alert('Please select a time in the future');
        return;
      }
    }

    setBusy(true);
    try {
      const bookingData: BookingData = {
        ...formData,
        subject: formData.subject.trim(),
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime.toTimeString().split(' ')[0].substring(0, 5)
      };

      console.log('📤 Creating booking with data:', bookingData);
      await onConfirm(bookingData);
      
      // Reset form only after successful booking
      setFormData({
        date: '',
        time: '',
        duration: 60,
        subject: '',
        notes: ''
      });
      setSelectedDate(null);
      setSelectedTime(null);
      onClose();
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value
    }));
  };

  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); // 3 months in advance
    return maxDate;
  };

  const isStudentBookingTutor = currentUser.role === 'student' && targetUser.role === 'tutor';
  const isTutorBookingStudent = currentUser.role === 'tutor' && targetUser.role === 'student';

  // For both cases: show only subjects the student has enrolled in
  // (fetched from database for the appropriate user)
  const availableSubjects = enrolledCourses;
  
  // Fallback subjects if no enrolled courses are found
  const fallbackSubjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Programming',
    'Database Development',
    'Network Development',
    'Web Development',
    'Data Science',
    'Statistics',
    'Business',
    'Economics',
    'English',
    'History',
    'Research',
    'Academic Writing'
  ];
  
  // Use enrolled subjects if available, otherwise fallback to common subjects
  const allSubjects = availableSubjects.length > 0 
    ? availableSubjects.sort()
    : fallbackSubjects.sort();
  
  // Debug logging
  console.log('🔍 EnhancedBookingModal Debug:', {
    isStudentBookingTutor,
    currentUser: currentUser,
    enrolledCourses,
    targetUser: targetUser,
    availableSubjects,
    allSubjects,
    usingFallback: availableSubjects.length === 0,
    isLoadingCourses
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledById="booking-title">
      <h2 id="booking-title" className="modal-title">
        <i className="fas fa-calendar-plus"></i>
        {isStudentBookingTutor ? 'Book Session' : 'Schedule Session'}
      </h2>
      
      <div className="modal-body">
        <p className="booking-target-info">
          {isStudentBookingTutor && (
            <>Booking a session with <strong>{targetUser.name || 'Tutor'} {targetUser.surname || ''}</strong></>
          )}
          {isTutorBookingStudent && (
            <>Scheduling a session with <strong>{targetUser.name || 'Student'} {targetUser.surname || ''}</strong></>
          )}
        </p>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label htmlFor="date" className="form-label">
              <i className="fas fa-calendar"></i>
              Date *
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              minDate={getMinDate()}
              maxDate={getMaxDate()}
              dateFormat="MMMM d, yyyy"
              placeholderText="Select a date"
              className="form-input datepicker-input"
              showPopperArrow={false}
              popperClassName="datepicker-popper"
            />
          </div>

          <div className="form-group">
            <label htmlFor="time" className="form-label">
              <i className="fas fa-clock"></i>
              Time *
            </label>
            <DatePicker
              selected={selectedTime}
              onChange={(time) => setSelectedTime(time)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="h:mm aa"
              placeholderText="Select time"
              className="form-input timepicker-input"
              showPopperArrow={false}
              popperClassName="timepicker-popper"
              minTime={new Date(new Date().setHours(8, 0, 0, 0))}
              maxTime={new Date(new Date().setHours(22, 0, 0, 0))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration" className="form-label">
              <i className="fas fa-hourglass-half"></i>
              Duration
            </label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="form-input"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject" className="form-label">
              <i className="fas fa-book"></i>
              {isStudentBookingTutor ? 'Subject *' : 'Student\'s Subject *'}
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="form-input"
              required
              disabled={isLoadingCourses}
            >
              <option value="">
                {isLoadingCourses ? "Loading subjects..." : "Select a subject"}
              </option>
              {allSubjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <small className="form-help">
              {isLoadingCourses ? (
                "Loading your enrolled courses..."
              ) : availableSubjects.length > 0 ? (
                isStudentBookingTutor 
                  ? `Your enrolled subjects: ${availableSubjects.join(', ')}`
                  : `Student's enrolled subjects: ${availableSubjects.join(', ')}`
              ) : (
                isStudentBookingTutor
                  ? "No student profile found or no enrolled subjects. Please complete your student profile in Settings to select your enrolled courses."
                  : "Student has no enrolled subjects. Please ask them to update their profile."
              )}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              <i className="fas fa-sticky-note"></i>
              Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any specific topics you'd like to cover or questions you have..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </form>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy}
          onClick={handleSubmit}
        >
          <i className="fas fa-calendar-plus"></i>
          {busy ? "Creating Booking..." : "Create Booking"}
        </button>
      </div>
    </Dialog>
  );
}
