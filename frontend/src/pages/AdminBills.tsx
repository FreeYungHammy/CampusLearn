import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { adminApi } from "../services/adminApi";
import { SocketManager } from "../services/socketManager";
import "./AdminBills.css";

interface TutorBill {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  totalHours: number;
  hourlyRate: number;
  totalAmount: number;
  completedBookings: number;
  month: string;
  year: number;
}

interface BillsData {
  tutors: TutorBill[];
  totalHours: number;
  totalAmount: number;
  month: string;
  year: number;
}

const AdminBills = () => {
  const [billsData, setBillsData] = useState<BillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableMonths, setAvailableMonths] = useState<{ month: string; year: number }[]>([]);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchAvailableMonths();
  }, [token]);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      // Set to current month by default
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear();
      
      const currentMonthData = availableMonths.find(
        m => m.month === currentMonth && m.year === currentYear
      );
      
      if (currentMonthData) {
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      } else {
        // If current month not available, use the most recent month
        const mostRecent = availableMonths[availableMonths.length - 1];
        setSelectedMonth(mostRecent.month);
        setSelectedYear(mostRecent.year);
      }
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchBillsData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, token]);

  // Listen for booking status updates and refresh data
  useEffect(() => {
    if (!token) return;

    const handleBookingStatusUpdate = (data: { bookingId: string; status: string; tutorId: string; studentId: string }) => {
      console.log("[AdminBills] Booking status updated:", data);
      
      // Only refresh if the booking status changed to 'completed' and we have current data
      if (data.status === 'completed' && billsData) {
        console.log("[AdminBills] Refreshing bills data due to booking completion");
        fetchBillsData(selectedMonth, selectedYear);
      }
    };

    // Register the socket handler
    SocketManager.registerHandlers({
      global: {
        onBookingStatusUpdated: handleBookingStatusUpdate
      }
    });

    // Cleanup on unmount
    return () => {
      SocketManager.unregisterHandlers({
        global: {
          onBookingStatusUpdated: handleBookingStatusUpdate
        }
      });
    };
  }, [token, selectedMonth, selectedYear, billsData]);

  const fetchAvailableMonths = async () => {
    if (!token) return;

    try {
      const months = await adminApi.getAvailableBillingMonths(token);
      setAvailableMonths(months);
    } catch (error) {
      console.error("Failed to fetch available months:", error);
      setError("Failed to load available months");
    }
  };

  const fetchBillsData = async (month: string, year: number) => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getTutorBills(token, month, year);
      setBillsData(data);
    } catch (error) {
      console.error("Failed to fetch bills data:", error);
      setError("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getMonthOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 3 }, (_, i) => currentYear - i);
    
    return years.map(year => {
      const monthsInYear = availableMonths.filter(m => m.year === year);
      if (monthsInYear.length === 0) return null;
      
      return (
        <optgroup key={year} label={year.toString()}>
          {monthsInYear.map(({ month }) => (
            <option key={`${year}-${month}`} value={`${year}-${month}`}>
              {month} {year}
            </option>
          ))}
        </optgroup>
      );
    }).filter(Boolean);
  };

  if (loading && !billsData) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading billing data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button onClick={() => fetchBillsData(selectedMonth, selectedYear)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="admin-header"
      >
        <div className="admin-header-content">
          <div className="admin-header-left">
            <h1 className="admin-title">
              <i className="fas fa-file-invoice-dollar"></i>
              Tutor Bills
            </h1>
            <p className="admin-subtitle">
              Monthly billing overview for tutors
            </p>
          </div>
          <div className="admin-header-right">
            <div className="admin-time-selector">
              <label htmlFor="month-select">Select Month:</label>
              <select
                id="month-select"
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  handleMonthChange(month, parseInt(year));
                }}
                className="admin-select"
                style={{ 
                  fontSize: window.innerWidth <= 768 ? '16px' : '14px', // Prevents zoom on iOS
                  padding: window.innerWidth <= 768 ? '12px' : '8px'
                }}
              >
                {getMonthOptions()}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {billsData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="admin-summary-cards"
        >
          <div className="admin-summary-card">
            <div className="admin-summary-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="admin-summary-content">
              <div className="admin-summary-value">{billsData.tutors.length}</div>
              <div className="admin-summary-label">Active Tutors</div>
            </div>
          </div>
          
          <div className="admin-summary-card">
            <div className="admin-summary-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="admin-summary-content">
              <div className="admin-summary-value">{formatHours(billsData.totalHours)}</div>
              <div className="admin-summary-label">Total Hours</div>
            </div>
          </div>
          
          <div className="admin-summary-card">
            <div className="admin-summary-icon">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="admin-summary-content">
              <div className="admin-summary-value">{formatCurrency(billsData.totalAmount)}</div>
              <div className="admin-summary-label">Total Amount</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bills Table */}
      {billsData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="admin-bills-table-container"
        >
          <div className="admin-table-header">
            <h3>
              <i className="fas fa-list"></i>
              Tutor Bills - {selectedMonth} {selectedYear}
            </h3>
          </div>
          
          {/* Card Layout */}
          <div className="admin-bills-table-mobile">
            {billsData.tutors.map((tutor, index) => (
              <motion.div
                key={tutor.tutorId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="admin-bill-card"
              >
                <div className="admin-bill-tutor-info">
                  <div className="admin-bill-tutor-name">{tutor.tutorName}</div>
                  <div className="admin-bill-tutor-email">{tutor.tutorEmail}</div>
                </div>
                
                 <div className="admin-bill-stats">
                   <div className="admin-bill-stat-item">
                     <div className="admin-bill-stat-label">Sessions</div>
                     <div className="admin-bill-stat-value sessions">{tutor.completedBookings}</div>
                   </div>
                   <div className="admin-bill-stat-item">
                     <div className="admin-bill-stat-label">Hours</div>
                     <div className="admin-bill-stat-value hours">{formatHours(tutor.totalHours)}</div>
                   </div>
                   <div className="admin-bill-stat-item">
                     <div className="admin-bill-stat-label">Rate</div>
                     <div className="admin-bill-stat-value rate">{formatCurrency(tutor.hourlyRate)}</div>
                   </div>
                   <div className="admin-bill-stat-item">
                     <div className="admin-bill-stat-label">Total</div>
                     <div className="admin-bill-stat-value total">{formatCurrency(tutor.totalAmount)}</div>
                   </div>
                 </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Data Message */}
      {billsData && billsData.tutors.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="admin-no-data"
        >
          <i className="fas fa-inbox"></i>
          <h3>No billing data for {selectedMonth} {selectedYear}</h3>
          <p>No completed bookings found for this month.</p>
        </motion.div>
      )}
    </div>
  );
};

export default AdminBills;
