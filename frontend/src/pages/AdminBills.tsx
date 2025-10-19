import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { adminApi, type TutorBill, type BillsData } from "../services/adminApi";
import "./AdminBills.css";

const AdminBills = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<{ month: string; year: number }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [billsData, setBillsData] = useState<BillsData | null>(null);

  useEffect(() => {
    fetchAvailableMonths();
  }, [token]);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchBillsData();
    }
  }, [selectedMonth, selectedYear, token]);

  const fetchAvailableMonths = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const months = await adminApi.getAvailableBillingMonths(token);
      setAvailableMonths(months);
      
      // Set default to current month if available, otherwise first available month
      if (months.length > 0) {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const currentYear = new Date().getFullYear();
        
        const currentMonthData = months.find(m => m.month === currentMonth && m.year === currentYear);
        if (currentMonthData) {
          setSelectedMonth(currentMonth);
          setSelectedYear(currentYear);
        } else {
          setSelectedMonth(months[0].month);
          setSelectedYear(months[0].year);
        }
      } else {
        // If no months available, set current month as default
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const currentYear = new Date().getFullYear();
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      }
    } catch (error) {
      console.error("Failed to fetch available months:", error);
      setError("Failed to load available months");
      // Set current month as fallback
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillsData = async () => {
    if (!token || !selectedMonth || !selectedYear) return;

    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getTutorBills(token, selectedMonth, selectedYear);
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

  const getMonthOptions = () => {
    const options = availableMonths.map((monthData, index) => (
      <option key={`${monthData.month}-${monthData.year}-${index}`} value={`${monthData.year}-${monthData.month}`}>
        {monthData.month} {monthData.year}
      </option>
    ));
    return options;
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
    
    if (wholeHours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
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
          <button onClick={fetchAvailableMonths}>
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
                  fontSize: window.innerWidth <= 768 ? '16px' : '14px',
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
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="admin-summary-content">
              <div className="admin-summary-value">{formatCurrency(billsData.totalAmount)}</div>
              <div className="admin-summary-label">Total Amount</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bills Data */}
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
