import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useAuthStore } from "../store/authStore";
import BookingStepperModal from "../components/BookingStepperModal";
import AdminDashboard from "./AdminDashboard";
import { getBookings, type Booking } from "../services/bookingApi";
import type { Tutor } from "../types/Tutors";

// Daily motivational quotes
const motivationalQuotes = [
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Learning never exhausts the mind. - Leonardo da Vinci",
  "The expert in anything was once a beginner. - Helen Hayes",
  "Knowledge is power, but enthusiasm pulls the switch. - Steve Droke",
  "Education is not preparation for life; education is life itself. - John Dewey",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice. - Brian Herbert",
  "Invest in yourself. Your career is the engine of your wealth. - Paul Clitheroe",
  "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
  "Don't let yesterday take up too much of today. - Will Rogers",
  "Learning is a treasure that will follow its owner everywhere. - Chinese Proverb",
  "The more that you read, the more things you will know. The more that you learn, the more places you'll go. - Dr. Seuss",
  "Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi",
  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today. - Malcolm X",
  "The only impossible journey is the one you never begin. - Tony Robbins",
  "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
  "You don't have to be great to get started, but you have to get started to be great. - Les Brown",
  "The way to get started is to quit talking and begin doing. - Walt Disney",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Sometimes later becomes never. Do it now.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
];


// Quick Action Button Component
const QuickAction: React.FC<{
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
  onClick: () => void;
}> = ({ icon, title, description, color, delay, onClick }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="quick-action-btn"
    style={{ "--action-color": color } as React.CSSProperties}
    onClick={onClick}
    type="button"
  >
    <div className="action-icon">
      <i className={icon}></i>
    </div>
    <div className="action-content">
      <div className="action-title">{title}</div>
      <div className="action-description">{description}</div>
    </div>
  </motion.button>
);

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaysQuote, setTodaysQuote] = useState("");
  const [showDashboardBookingStepper, setShowDashboardBookingStepper] =
    useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Show admin dashboard for admin users
  if (user?.role === "admin") {
    return <AdminDashboard />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return " Good Morning";
    if (hour < 17) return " Good Afternoon";
    return "Good Evening";
  };

  // Use a stable callback for opening the modal to avoid closure issues
  const openBookingStepper = useCallback(() => {
    setShowDashboardBookingStepper(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Get today's date and use it to select a consistent quote for the day
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    setTodaysQuote(motivationalQuotes[quoteIndex]);
  }, []);

  // Fetch bookings for the schedule calendar
  const fetchBookings = async () => {
    try {
      setIsLoadingBookings(true);
      const data = await getBookings();
      setBookings(data);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Handle calendar event click to navigate to bookings page
  const handleEventClick = (clickInfo: any) => {
    const booking = clickInfo.event.extendedProps;
    // Navigate to bookings page with booking ID in URL hash
    navigate(`/bookings#${booking.id}`);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Transform bookings into calendar events
  const calendarEvents = bookings.map((booking) => ({
    id: booking.id || (booking as any)._id,
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

  // Filter upcoming bookings (future bookings only, sorted by date/time)
  const upcomingBookings = bookings
    .filter(booking => {
      const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
      const now = new Date();
      return bookingDateTime >= now && booking.status !== 'cancelled' && booking.status !== 'completed';
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });



  return (
    <div className="content-view active dashboard-modern" id="dashboard-view">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="dashboard-header"
      >
        <div className="welcome-section">
          <h1 className="dashboard-title welcome-greeting">
            <i className="fas fa-clock"></i>
            {getGreeting()}, {user?.name} {user?.surname}!
          </h1>
          <div className="time-info welcome-time-date">
            <div className="current-time">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <h2 className="welcome-message">
            Welcome back to your learning journey!
          </h2>
          {todaysQuote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="motivational-quote"
            >
              <span className="quote-mark opening">"</span>
              <span className="quote-text">Your limitation—it's only your imagination.</span>
              <span className="quote-mark closing">"</span>
            </motion.div>
          )}
        </div>
      </motion.div>
      

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="quick-actions"
      >
        <h3 className="section-subtitle">
          <i className="fas fa-bolt"></i>
          Quick Actions
        </h3>
        <div className="actions-grid">
          {user?.role === "student" ? (
            <>
              <QuickAction
                icon="fas fa-plus-circle"
                title="Book Session"
                description="Schedule with a tutor"
                color="#3498db"
                delay={0.1}
                onClick={openBookingStepper}
              />
              <QuickAction
                icon="fas fa-comments"
                title="Send Message"
                description="Chat with your tutors"
                color="#2ecc71"
                delay={0.2}
                onClick={() => navigate("/messages")}
              />
              <QuickAction
                icon="fas fa-search"
                title="Find Tutors"
                description="Discover new experts"
                color="#e74c3c"
                delay={0.3}
                onClick={() => navigate("/tutors")}
              />
            </>
          ) : (
            <>
              <QuickAction
                icon="fas fa-users"
                title="My Students"
                description="Manage your students"
                color="#3498db"
                delay={0.1}
                onClick={() => navigate("/mystudents")}
              />
              <QuickAction
                icon="fas fa-comments"
                title="Messages"
                description="Chat with students"
                color="#2ecc71"
                delay={0.2}
                onClick={() => navigate("/messages")}
              />
              <QuickAction
                icon="fas fa-upload"
                title="Upload Content"
                description="Share educational materials"
                color="#e74c3c"
                delay={0.3}
                onClick={() => navigate("/upload")}
              />
              <QuickAction
                icon="fas fa-folder-open"
                title="My Content"
                description="Manage your materials"
                color="#f39c12"
                delay={0.4}
                onClick={() => navigate("/mycontent")}
              />
            </>
          )}
        </div>
      </motion.div>

      {/* Calendar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="calendar-section"
      >
        <h3 className="section-subtitle">
          <i className="fas fa-calendar-alt"></i>
          My Schedule
        </h3>
        <div className="calendar-shell-modern">
          {isLoadingBookings ? (
            <div className="loading-container">
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p>Loading your schedule...</p>
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={handleEventClick}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth",
              }}
              height="auto"
              expandRows={true}
              fixedWeekCount={false}
              showNonCurrentDates={false}
              dayMaxEventRows={2}
              moreLinkClick="popover"
              titleFormat={{ year: "numeric", month: "long" }}
              weekends={true}
              editable={false}
              selectable={false}
              eventDisplay="block"
              dayHeaderFormat={{ weekday: "short" }}
              firstDay={1}
              displayEventTime={false}
            />
          )}
        </div>
        
        {/* Mobile Upcoming Bookings */}
        <div className="upcoming-bookings-mobile">
          <h3 className="upcoming-bookings-title">
            <i className="fas fa-clock"></i>
            Upcoming Bookings
          </h3>
          
          {isLoadingBookings ? (
            <div className="loading-container">
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p>Loading upcoming bookings...</p>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="no-bookings">
              <i className="fas fa-calendar-times"></i>
              <p>No upcoming bookings</p>
              <small>Your next sessions will appear here</small>
            </div>
          ) : (
            upcomingBookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="booking-item" onClick={() => navigate(`/bookings#${booking.id}`)}>
                <div className="booking-time">
                  <div className="booking-date">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="booking-time-only">{booking.time}</div>
                </div>
                <div className="booking-details">
                  <div className="booking-title">{booking.subject}</div>
                  <div className="booking-subtitle">
                    {user?.role === 'student' 
                      ? `with ${booking.tutor.name} ${booking.tutor.surname}`
                      : `with ${booking.student.name} ${booking.student.surname}`
                    }
                  </div>
                </div>
                <div className={`booking-status ${booking.status}`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Booking Stepper Modal */}
      {user?.role === "student" && (
        <BookingStepperModal
          key="dashboard-modal"
          isOpen={showDashboardBookingStepper}
          onClose={() => setShowDashboardBookingStepper(false)}
          currentUser={user}
          modalId="Dashboard"
        />
      )}
    </div>
  );
};

export default Dashboard;
