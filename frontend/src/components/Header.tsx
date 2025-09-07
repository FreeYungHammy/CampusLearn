import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Header = () => {
  const openLogoutModal = useAuthStore((state) => state.openLogoutModal);
  const [isTutor, setIsTutor] = useState(false);

  const handleRoleChange = (role) => {
    setIsTutor(role === "tutor");
  };

  const handleLogout = () => {
    openLogoutModal();
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
        <div className="role-toggle">
          <div
            className={`role-btn student ${!isTutor ? "active" : ""}`}
            onClick={() => handleRoleChange("student")}
          >
            Student
          </div>
          <div
            className={`role-btn tutor ${isTutor ? "active" : ""}`}
            onClick={() => handleRoleChange("tutor")}
          >
            Tutor
          </div>
        </div>

        <div className="user-profile">
          <img
            src="https://randomuser.me/api/portraits/men/67.jpg"
            alt="User Avatar"
            className="user-avatar"
          />
          <div className="user-name">John Doe</div>
        </div>

        <button className="logout-btn" title="Logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;
