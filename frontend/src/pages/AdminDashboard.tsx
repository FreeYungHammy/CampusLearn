import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  adminApi,
  type AdminStats,
  type RecentActivity,
  type HealthCheckResult,
  type HealthScore,
} from "../services/adminApi";

// Admin Stat Card Component
const AdminStatCard: React.FC<{
  icon: string;
  title: string;
  value: string | number;
  change: string;
  color: string;
  delay: number;
}> = ({ icon, title, value, change, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="admin-stat-card"
    style={{ "--stat-color": color } as React.CSSProperties}
  >
    <div className="admin-stat-icon">
      <i className={icon}></i>
    </div>
    <div className="admin-stat-content">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-title">{title}</div>
      <div className="admin-stat-change">{change}</div>
    </div>
  </motion.div>
);

// Admin Quick Action Component
const AdminQuickAction: React.FC<{
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
    className="admin-quick-action-btn"
    style={{ "--action-color": color } as React.CSSProperties}
    onClick={onClick}
    type="button"
  >
    <div className="admin-action-icon">
      <i className={icon}></i>
    </div>
    <div className="admin-action-content">
      <div className="admin-action-title">{title}</div>
      <div className="admin-action-description">{description}</div>
    </div>
  </motion.button>
);

// Recent Activity Item Component
const RecentActivityItem: React.FC<{
  icon: string;
  title: string;
  description: string;
  time: string;
  type: "success" | "warning" | "error" | "info";
}> = ({ icon, title, description, time, type }) => (
  <div className={`recent-activity-item activity-${type}`}>
    <div className="activity-icon">
      <i className={icon}></i>
    </div>
    <div className="activity-content">
      <div className="activity-title">{title}</div>
      <div className="activity-description">{description}</div>
      <div className="activity-time">{time}</div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalContent: 0,
    systemHealth: "Good",
    weeklyGrowth: 0,
    dailyActiveUsers: 0,
    monthlyContentGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch system statistics and recent activity
    const fetchAdminData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        const [stats, activity, health, score] = await Promise.all([
          adminApi.getAdminStats(token),
          adminApi.getRecentActivity(token),
          adminApi.getSystemHealth(token),
          adminApi.getSystemHealthScore(token),
        ]);

        setSystemStats(stats);
        setRecentActivity(activity);
        setHealthChecks(health);
        setHealthScore(score);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [token]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="content-view active admin-dashboard">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="admin-header"
      >
        <div className="admin-greeting">
          <h1 className="admin-title">
            {getGreeting()}, {user?.name} {user?.surname}!
          </h1>
          <p className="admin-subtitle">
            {formatTime(currentTime)}, {formatDate(currentTime)}
          </p>
        </div>
        <div className="admin-welcome">
          <p>Welcome to your administrative dashboard!</p>
          <div className="admin-quote">
            "Great administrators are not born, they are made through continuous
            learning and adaptation."
          </div>
        </div>
      </motion.div>

      {/* System Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="admin-stats"
      >
        <h3 className="admin-section-title">
          <i className="fas fa-chart-bar"></i>
          System Overview
        </h3>
        <div className="admin-stats-grid">
          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading system statistics...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <AdminStatCard
                icon="fas fa-users"
                title="Total Users"
                value={systemStats.totalUsers}
                change={`+${systemStats.weeklyGrowth} this week`}
                color="#3498db"
                delay={0.1}
              />
              <AdminStatCard
                icon="fas fa-user-check"
                title="Active Users"
                value={systemStats.activeUsers}
                change={`+${systemStats.dailyActiveUsers} today`}
                color="#2ecc71"
                delay={0.2}
              />
              <AdminStatCard
                icon="fas fa-folder"
                title="Total Content"
                value={systemStats.totalContent}
                change={`+${systemStats.monthlyContentGrowth} this month`}
                color="#e74c3c"
                delay={0.3}
              />
              <AdminStatCard
                icon="fas fa-heartbeat"
                title="Connection Score"
                value={healthScore ? `${healthScore.score}/100` : "N/A"}
                change={
                  healthScore
                    ? `${healthScore.message} (${healthScore.averageResponseTime}ms avg)`
                    : "Loading..."
                }
                color={
                  healthScore
                    ? healthScore.status === "excellent"
                      ? "#2ecc71"
                      : healthScore.status === "good"
                        ? "#3498db"
                        : healthScore.status === "fair"
                          ? "#f39c12"
                          : healthScore.status === "warning"
                            ? "#e67e22"
                            : "#e74c3c"
                    : "#95a5a6"
                }
                delay={0.4}
              />
            </>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="admin-quick-actions"
      >
        <h3 className="admin-section-title">
          <i className="fas fa-bolt"></i>
          Quick Actions
        </h3>
        <div className="admin-actions-grid">
          <AdminQuickAction
            icon="fas fa-users-cog"
            title="Manage Users"
            description="View and manage user accounts"
            color="#3498db"
            delay={0.1}
            onClick={() => navigate("/users")}
          />
          <AdminQuickAction
            icon="fas fa-cog"
            title="System Settings"
            description="Configure system parameters"
            color="#e74c3c"
            delay={0.2}
            onClick={() => navigate("/settings")}
          />
          <AdminQuickAction
            icon="fas fa-database"
            title="Database Tools"
            description="Manage database and backups"
            color="#f39c12"
            delay={0.3}
            onClick={() => navigate("/database-tools")}
          />
        </div>
      </motion.div>

      {/* Recent Activity & System Status */}
      <div className="admin-bottom-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="admin-recent-activity"
        >
          <h3 className="admin-section-title">
            <i className="fas fa-history"></i>
            Recent Activity
          </h3>
          <div className="activity-list">
            {loading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading recent activity...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-history"></i>
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <RecentActivityItem
                  key={index}
                  icon={activity.icon}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  type={activity.type}
                />
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="admin-system-status"
        >
          <h3 className="admin-section-title">
            <i className="fas fa-server"></i>
            System Status
          </h3>
          <div className="status-cards">
            {loading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading system status...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <p>Unable to load system status</p>
              </div>
            ) : healthChecks.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-server"></i>
                <p>No health check data available</p>
              </div>
            ) : (
              healthChecks.map((check, index) => (
                <div
                  key={index}
                  className={`status-card status-${check.status}`}
                >
                  <div className="status-icon">
                    <i
                      className={
                        check.status === "error"
                          ? "fas fa-times-circle"
                          : check.status === "warning"
                            ? "fas fa-exclamation-triangle"
                            : "fas fa-check-circle"
                      }
                    ></i>
                  </div>
                  <div className="status-content">
                    <div className="status-title">{check.name}</div>
                    <div className="status-description">{check.message}</div>
                    <div className="status-response-time">
                      Response: {check.responseTime !== undefined ? `${check.responseTime}ms` : 'N/A'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
