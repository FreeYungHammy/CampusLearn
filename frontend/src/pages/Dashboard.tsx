import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useAuthStore } from "../store/authStore";
import BookingStepperModal from "../components/BookingStepperModal";
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
  "Wake up with determination. Go to bed with satisfaction."
];

const events = [
  {
    title: "Calculus with Gideon",
    start: "2023-11-03T14:00:00",
    className: "event-math",
  },
  {
    title: "Programming with Sarah",
    start: "2023-11-08T15:30:00",
    className: "event-cs",
  },
  {
    title: "Finance with David",
    start: "2023-11-14T11:00:00",
    className: "event-business",
  },
  {
    title: "Algebra with Gideon",
    start: "2023-11-22T16:00:00",
    className: "event-math",
  },
  {
    title: "Web Dev with Sarah",
    start: "2023-11-30T13:00:00",
    className: "event-cs",
  },
];

// Animated Stat Card Component
const StatCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  change: string;
  delay: number;
}> = ({ icon, title, value, change, delay }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const targetValue = parseInt(value.replace(/[^\d]/g, ''));
      const increment = targetValue / 50;
      let current = 0;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
          setCount(targetValue);
          clearInterval(counter);
        } else {
          setCount(Math.floor(current));
        }
      }, 30);
      
      return () => clearInterval(counter);
    }, delay * 200);
    
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="stat-card"
    >
      <div className="stat-icon">
        <i className={icon}></i>
      </div>
      <div className="stat-content">
        <div className="stat-value">{value.includes('%') ? `${count}%` : count.toLocaleString()}</div>
        <div className="stat-title">{title}</div>
        <div className="stat-change">{change}</div>
      </div>
    </motion.div>
  );
};

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
    style={{ '--action-color': color } as React.CSSProperties}
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
  const [showDashboardBookingStepper, setShowDashboardBookingStepper] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    setTodaysQuote(motivationalQuotes[quoteIndex]);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="content-view active dashboard-modern" id="dashboard-view">

      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="dashboard-header"
      >
        <div className="header-content">
          <h1 className="dashboard-title">
            <i className="fas fa-tachometer-alt"></i>
            {getGreeting()}, {user?.name} {user?.surname}!
          </h1>
          <div className="time-info">
            <div className="current-time">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="header-right">
          <p className="dashboard-subtitle">
            {user?.role === 'student' 
              ? 'Welcome back to your learning journey!' 
              : 'Welcome back to your teaching dashboard!'
            }
          </p>
          {todaysQuote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="motivational-quote"
            >
              <i className="fas fa-quote-left"></i>
              <span className="quote-text">{todaysQuote}</span>
              <i className="fas fa-quote-right"></i>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="stats-grid"
      >
        {user?.role === 'student' ? (
          <>
            <StatCard
              icon="fas fa-calendar-check"
              title="Sessions This Month"
              value="0"
              change="+0 from last month"
              delay={0.1}
            />
            <StatCard
              icon="fas fa-users"
              title="Active Tutors"
              value="0"
              change="0 new connections"
              delay={0.2}
            />
            <StatCard
              icon="fas fa-clock"
              title="Study Hours"
              value="0h"
              change="+0h this week"
              delay={0.3}
            />
            <StatCard
              icon="fas fa-trophy"
              title="Success Rate"
              value="0%"
              change="+0% improvement"
              delay={0.4}
            />
          </>
        ) : (
          <>
            <StatCard
              icon="fas fa-calendar-check"
              title="Sessions Taught"
              value="0"
              change="+0 this month"
              delay={0.1}
            />
            <StatCard
              icon="fas fa-users"
              title="Active Students"
              value="0"
              change="0 new students"
              delay={0.2}
            />
            <StatCard
              icon="fas fa-clock"
              title="Teaching Hours"
              value="0h"
              change="+0h this week"
              delay={0.3}
            />
            <StatCard
              icon="fas fa-star"
              title="Average Rating"
              value="0"
              change="+0 this month"
              delay={0.4}
            />
          </>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="quick-actions"
      >
        <h3 className="section-subtitle">
          <i className="fas fa-bolt"></i>
          Quick Actions
        </h3>
        <div className="actions-grid">
          {user?.role === 'student' ? (
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
                onClick={() => navigate('/messages')}
              />
              <QuickAction
                icon="fas fa-search"
                title="Find Tutors"
                description="Discover new experts"
                color="#e74c3c"
                delay={0.3}
                onClick={() => navigate('/tutors')}
              />
              <QuickAction
                icon="fas fa-chart-line"
                title="View Progress"
                description="Track your learning"
                color="#f39c12"
                delay={0.4}
                onClick={() => navigate('/mycontent')}
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
                onClick={() => navigate('/mystudents')}
              />
              <QuickAction
                icon="fas fa-comments"
                title="Messages"
                description="Chat with students"
                color="#2ecc71"
                delay={0.2}
                onClick={() => navigate('/messages')}
              />
              <QuickAction
                icon="fas fa-upload"
                title="Upload Content"
                description="Share educational materials"
                color="#e74c3c"
                delay={0.3}
                onClick={() => navigate('/upload')}
              />
              <QuickAction
                icon="fas fa-folder-open"
                title="My Content"
                description="Manage your materials"
                color="#f39c12"
                delay={0.4}
                onClick={() => navigate('/mycontent')}
              />
            </>
          )}
        </div>
      </motion.div>

      {/* Calendar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="calendar-section"
      >
        <h3 className="section-subtitle">
          <i className="fas fa-calendar-alt"></i>
          My Schedule
        </h3>
        <div className="calendar-shell-modern">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth",
            }}
            height="auto"
            expandRows={true}
            fixedWeekCount={false}
            showNonCurrentDates={false}
            dayMaxEventRows={3}
            moreLinkClick="popover"
            titleFormat={{ year: "numeric", month: "long" }}
            dayHeaderFormat={{ weekday: "short" }}
            firstDay={1}
          />
        </div>
      </motion.div>

      {/* Booking Stepper Modal */}
      {user?.role === 'student' && (
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
