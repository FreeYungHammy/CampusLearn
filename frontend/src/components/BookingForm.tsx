import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createBooking, getStudentByUserId } from '../services/bookingApi';
import type { Tutor } from '../types/Tutors';
import type { User } from '../types/Common';
import './BookingForm.css';

interface BookingData {
  date: string;
  time: string;
  duration: number;
  subject: string;
  notes: string;
}

interface BookingFormProps {
  tutor: Tutor;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ tutor, currentUser, onClose, onSuccess }) => {
  console.log('🏗️ BookingForm: Component created with tutor:', tutor.name);
  
  const [bookingData, setBookingData] = useState<BookingData>({
    date: '',
    time: '',
    duration: 60,
    subject: tutor.subjects[0] || '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof BookingData, value: string | number) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.date || !bookingData.time) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 BookingForm: Submitting booking for tutor:', tutor.name);
      console.log('📋 Booking data:', bookingData);
      
      // Get the student ID from the user ID
      const student = await getStudentByUserId(currentUser.id);
      console.log('👨‍🎓 Student found:', student);
      
      // Create the booking with all required data
      const finalBookingData = {
        studentId: student.id,
        tutorId: tutor.id,
        subject: bookingData.subject,
        date: bookingData.date,
        time: bookingData.time,
        duration: bookingData.duration,
        notes: bookingData.notes,
        initiatedBy: 'student' as const,
      };

      console.log('📤 Sending booking data to API:', finalBookingData);
      const newBooking = await createBooking(finalBookingData);
      console.log('✅ Booking created successfully:', newBooking);
      
      onSuccess();
    } catch (err) {
      console.error('💥 Booking failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="booking-form-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="booking-form-container" style={{ backgroundColor: 'white', border: '2px solid red' }}>
        <div className="booking-form-header">
          <h2>Book Session with {tutor.name} {tutor.surname}</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label>Subject</label>
            <select
              value={bookingData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="form-input"
              required
            >
              {tutor.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={bookingData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="form-input"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={bookingData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <select
              value={bookingData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="form-input"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={bookingData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any specific topics or questions?"
              className="form-textarea"
              rows={3}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !bookingData.date || !bookingData.time}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Booking...
                </>
              ) : (
                <>
                  <i className="fas fa-calendar-plus"></i>
                  Book Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
