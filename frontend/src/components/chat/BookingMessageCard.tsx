import React from 'react';
import { ChatMessage } from '../../types/ChatMessage';
import { Booking } from '../../services/bookingApi';
import './BookingMessageCard.css';

interface BookingMessageCardProps {
  message: ChatMessage;
  booking?: Booking;
  isOwnMessage: boolean;
  onBookingAction?: (bookingId: string, action: 'confirm' | 'cancel') => void;
}

const BookingMessageCard: React.FC<BookingMessageCardProps> = ({
  message,
  booking,
  isOwnMessage,
  onBookingAction
}) => {
  const getBookingIcon = (messageType: string) => {
    switch (messageType) {
      case 'booking_created':
        return '📅';
      case 'booking_confirmed':
        return '✅';
      case 'booking_cancelled':
        return '❌';
      case 'booking_completed':
        return '🎉';
      default:
        return '📅';
    }
  };

  const getBookingStatusColor = (messageType: string) => {
    switch (messageType) {
      case 'booking_created':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'booking_confirmed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'booking_cancelled':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'booking_completed':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBookingStatusText = (messageType: string) => {
    switch (messageType) {
      case 'booking_created':
        return 'New Booking Request';
      case 'booking_confirmed':
        return 'Booking Confirmed';
      case 'booking_cancelled':
        return 'Booking Cancelled';
      case 'booking_completed':
        return 'Session Completed';
      default:
        return 'Booking Update';
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `${formattedDate} at ${time}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={`booking-message-card ${isOwnMessage ? 'own-message' : 'other-message'}`}>
      <div className={`booking-card ${getBookingStatusColor(message.messageType || 'booking_created')}`}>
        <div className="booking-header">
          <div className="booking-icon">
            {getBookingIcon(message.messageType || 'booking_created')}
          </div>
          <div className="booking-title">
            <h4>{getBookingStatusText(message.messageType || 'booking_created')}</h4>
            <span className="booking-subject">{booking?.subject || 'Learning Session'}</span>
          </div>
        </div>

        {booking && (
          <div className="booking-details">
            <div className="booking-detail-row">
              <i className="fas fa-calendar-alt"></i>
              <span>{formatDateTime(booking.date, booking.time)}</span>
            </div>
            <div className="booking-detail-row">
              <i className="fas fa-clock"></i>
              <span>{formatDuration(booking.duration)}</span>
            </div>
            {booking.notes && (
              <div className="booking-detail-row">
                <i className="fas fa-sticky-note"></i>
                <span>{booking.notes}</span>
              </div>
            )}
          </div>
        )}

        <div className="booking-message-content">
          {message.content}
        </div>

        {/* Action buttons for pending bookings */}
        {message.messageType === 'booking_created' && 
         booking?.status === 'pending' && 
         !isOwnMessage && 
         onBookingAction && (
          <div className="booking-actions">
            <button
              className="booking-action-btn confirm-btn"
              onClick={() => onBookingAction(booking.id, 'confirm')}
            >
              <i className="fas fa-check"></i>
              Confirm
            </button>
            <button
              className="booking-action-btn cancel-btn"
              onClick={() => onBookingAction(booking.id, 'cancel')}
            >
              <i className="fas fa-times"></i>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingMessageCard;
