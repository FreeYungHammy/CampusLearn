import React from "react";
import { Booking } from "../services/bookingApi";
import { type User } from "../types/Users";
import "./BookingDetailsModal.css";

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  currentUser: User | null;
  onAccept: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string) => Promise<void>;
  onComplete: (bookingId: string) => Promise<void>;
  onCancel: (bookingId: string) => Promise<void>;
  isLoading: boolean;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  isOpen,
  onClose,
  booking,
  currentUser,
  onAccept,
  onReject,
  onComplete,
  onCancel,
  isLoading
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { class: 'status-pending', icon: 'fas fa-clock', text: 'Pending' },
      confirmed: { class: 'status-confirmed', icon: 'fas fa-check', text: 'Confirmed' },
      completed: { class: 'status-completed', icon: 'fas fa-check-double', text: 'Completed' },
      cancelled: { class: 'status-cancelled', icon: 'fas fa-times', text: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`status-badge ${config.class}`}>
        <i className={config.icon}></i>
        {config.text}
      </span>
    );
  };

  const canManageBooking = () => {
    if (!currentUser) return false;
    
    // Tutors can manage their own bookings
    if (currentUser.role === 'tutor' && currentUser.id === booking.tutor.userId) {
      return true;
    }
    
    // Students can manage their own bookings (for canceling)
    if (currentUser.role === 'student') {
      return true;
    }
    
    return false;
  };

  const canAccept = () => {
    return currentUser?.role === 'tutor' && currentUser.id === booking.tutor.userId && booking.status === 'pending';
  };

  const canReject = () => {
    return currentUser?.role === 'tutor' && currentUser.id === booking.tutor.userId && booking.status === 'pending';
  };

  const canComplete = () => {
    if (currentUser?.role !== 'tutor' || currentUser.id !== booking.tutor.userId || booking.status !== 'confirmed') {
      return false;
    }
    
    // Only allow completion if booking time has passed
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const bookingEndTime = new Date(bookingDateTime.getTime() + booking.duration * 60000);
    const now = new Date();
    
    return now >= bookingEndTime;
  };

  const canCancel = () => {
    if (!currentUser) return false;
    
    // Students can cancel their own bookings (pending or confirmed)
    if (currentUser.role === 'student') {
      return booking.status === 'pending' || booking.status === 'confirmed';
    }
    
    // Tutors can cancel their own confirmed bookings
    if (currentUser.role === 'tutor' && currentUser.id === booking.tutor.userId) {
      return booking.status === 'confirmed';
    }
    
    return false;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="booking-details-modal">
        <div className="modal-header">
          <h2>Booking Details</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="booking-info">
            <div className="info-section">
              <h3>
                <i className="fas fa-book"></i>
                Session Details
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Subject:</label>
                  <span className="subject">{booking.subject}</span>
                </div>
                <div className="info-item">
                  <label>Date:</label>
                  <span>{formatDate(booking.date)}</span>
                </div>
                <div className="info-item">
                  <label>Time:</label>
                  <span>{formatTime(booking.time)}</span>
                </div>
                <div className="info-item">
                  <label>Duration:</label>
                  <span>{booking.duration} minutes</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  {getStatusBadge(booking.status)}
                </div>
              </div>
            </div>


            {booking.notes && (
              <div className="info-section">
                <h3>
                  <i className="fas fa-sticky-note"></i>
                  Notes
                </h3>
                <div className="notes-content">
                  {booking.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {canManageBooking() && (
          <div className="modal-footer">
            <div className="action-buttons">
              {canAccept() && (
                <button
                  className="btn btn-success"
                  onClick={() => onAccept(booking.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-check"></i>
                  )}
                  Accept
                </button>
              )}

              {canReject() && (
                <button
                  className="btn btn-danger"
                  onClick={() => onReject(booking.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-times"></i>
                  )}
                  Reject
                </button>
              )}

              {canComplete() && (
                <button
                  className="btn btn-primary"
                  onClick={() => onComplete(booking.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-check-double"></i>
                  )}
                  Complete
                </button>
              )}

              {canCancel() && (
                <button
                  className="btn btn-warning"
                  onClick={() => onCancel(booking.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-ban"></i>
                  )}
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailsModal;
