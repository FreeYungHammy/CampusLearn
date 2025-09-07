import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Header = () => {
  const { user, logout, openLoginModal } = useAuthStore(); // keep login if added
  const isTutor = user?.role === "tutor";

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
      alert("You have been logged out successfully.");
      // In a real application, this would redirect to the login page
    }
  };

  const handleLogin = () => {
    if (openLoginModal) {
      openLoginModal();
    }
  };

  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className="logo-text">CampusLearn™</div>
      </div>

      <div className="nav-items">
        <NavLink to="/schedule" className="nav-item">
          <i className="fas fa-calendar"></i>
          <span>Schedule</span>
        </NavLink>
        <NavLink
          to="/mytutors"
          className="nav-item"
          style={{ display: isTutor ? "none" : "flex" }}
        >
          <i className="fas fa-user-friends"></i>
          <span>My Tutors</span>
        </NavLink>
        <NavLink
          to="/tutors"
          className="nav-item"
          style={{ display: isTutor ? "none" : "flex" }}
        >
          <i className="fas fa-user-graduate"></i>
          <span>Find Tutors</span>
        </NavLink>
        <NavLink
          to="/mystudents"
          className="nav-item"
          style={{ display: isTutor ? "flex" : "none" }}
        >
          <i className="fas fa-users"></i>
          <span>My Students</span>
        </NavLink>
        <NavLink
          to="/mycontent"
          className="nav-item"
          style={{ display: isTutor ? "flex" : "none" }}
        >
          <i className="fas fa-folder"></i>
          <span>My Content</span>
        </NavLink>
        <NavLink to="/forum" className="nav-item">
          <i className="fas fa-comments"></i>
          <span>Forum</span>
        </NavLink>
        <NavLink to="/messages" className="nav-item">
          <i className="fas fa-envelope"></i>
          <span>Messages</span>
        </NavLink>
        <NavLink
          to="/upload"
          className="nav-item"
          style={{ display: isTutor ? "flex" : "none" }}
        >
          <i className="fas fa-upload"></i>
          <span>Upload Content</span>
        </NavLink>
        <NavLink to="/settings" className="nav-item">
          <i className="fas fa-cog"></i>
          <span>Settings</span>
        </NavLink>
      </div>

      <div className="user-actions">
        {user ? (
          <>
            <div className="user-profile">
              <img
                src="https://randomuser.me/api/portraits/men/67.jpg"
                alt="User Avatar"
                className="user-avatar"
              />
              <div className="user-name">
                {user ? `${user.name} ${user.surname}` : ""}
              </div>
            </div>

            <button
              className="logout-btn"
              title="Logout"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </>
        ) : (
          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;