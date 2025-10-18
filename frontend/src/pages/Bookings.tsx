import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuthStore } from "../store/authStore";
import { getBookings, acceptBooking, rejectBooking, completeBooking, cancelBooking, type Booking } from "../services/bookingApi";
import BookingDetailsModal from "../components/BookingDetailsModal";
import PageHeader from "../components/PageHeader";
import "./Bookings.css";

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fetch bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Handle URL hash to open specific booking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#')) {
        const bookingId = hash.substring(1);
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          setSelectedBooking(booking);
          setIsModalOpen(true);
          // Remove hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getBookings();
      setBookings(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to load bookings";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform bookings into calendar events
  const calendarEvents = bookings.map((booking) => ({
    id: booking.id || (booking as any)._id, // Fallback to _id if id is missing
    title: `${booking.student.name} ${booking.student.surname}`,
    start: new Date(`${booking.date}T${booking.time}`),
    end: new Date(new Date(`${booking.date}T${booking.time}`).getTime() + booking.duration * 60000),
    backgroundColor: getStatusColor(booking.status),
    borderColor: getStatusColor(booking.status),
    textColor: '#ffffff',
    className: `fc-event-${booking.status}`, // Add status class for popover styling
    extendedProps: booking
  }));

  // Get color based on booking status
  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return '#facc15'; // Yellow
      case 'confirmed':
        return '#4ade80'; // Green
      case 'completed':
        return '#60a5fa'; // Blue
      case 'cancelled':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  // Handle event click to open booking details modal
  const handleEventClick = (clickInfo: any) => {
    const booking = clickInfo.event.extendedProps as Booking;
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Handle booking actions
  const handleAcceptBooking = async (bookingId: string) => {
    try {
      setActionLoading(bookingId);
      await acceptBooking(bookingId);
      await fetchBookings(); // Refresh bookings
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to accept booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to reject this booking? This action cannot be undone.")) {
      return;
    }
    
    try {
      setActionLoading(bookingId);
      await rejectBooking(bookingId);
      await fetchBookings(); // Refresh bookings
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reject booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      setActionLoading(bookingId);
      await completeBooking(bookingId);
      await fetchBookings(); // Refresh bookings
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to complete booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    
    try {
      setActionLoading(bookingId);
      await cancelBooking(bookingId);
      await fetchBookings(); // Refresh bookings
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bookings-page">
        <PageHeader 
          title="My Bookings" 
          subtitle="Manage your tutoring sessions and appointments"
          icon="fas fa-calendar-alt"
        />
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <PageHeader 
        title="My Bookings" 
        subtitle="Manage your tutoring sessions and appointments"
        icon="fas fa-calendar-alt"
      />

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <div className="bookings-container">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={window.innerWidth <= 768 ? "timeGridDay" : "dayGridMonth"}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: window.innerWidth <= 768 ? '' : 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="18:00:00"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
              startTime: '08:00',
              endTime: '18:00'
            }}
            eventDisplay="block"
            nowIndicator={true}
            editable={false}
            selectable={false}
            weekends={true}
            dayMaxEvents={2}
            moreLinkClick="popover"
            displayEventTime={false}
          />
        </div>

      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          currentUser={user}
          onAccept={handleAcceptBooking}
          onReject={handleRejectBooking}
          onComplete={handleCompleteBooking}
          onCancel={handleCancelBooking}
          isLoading={actionLoading === selectedBooking.id}
        />
      )}
    </div>
  );
};

export default Bookings;
