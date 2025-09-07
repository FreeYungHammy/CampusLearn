import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

const Header = () => {
  const user = useAuthStore((s) => s.user);
  const openLogoutModal = useAuthStore((s) => s.openLogoutModal);
  const isTutor = user?.role === "tutor";

  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className="logo-text">CampusLearn™</div>
      </div>

      <nav className="nav-items">
        <NavLink to="/schedule" className="nav-item">
          <i className="fas fa-calendar"></i>
          <span>Schedule</span>
        </NavLink>

        {/* student-only */}
        {!isTutor && (
          <>
            <NavLink to="/mytutors" className="nav-item">
              <i className="fas fa-user-friends"></i>
              <span>My Tutors</span>
            </NavLink>
            <NavLink to="/tutors" className="nav-item">
              <i className="fas fa-user-graduate"></i>
              <span>Find Tutors</span>
            </NavLink>
          </>
        )}

        {/* tutor-only */}
        {isTutor && (
          <>
            <NavLink to="/mystudents" className="nav-item">
              <i className="fas fa-users"></i>
              <span>My Students</span>
            </NavLink>
            <NavLink to="/mycontent" className="nav-item">
              <i className="fas fa-folder"></i>
              <span>My Content</span>
            </NavLink>
            <NavLink to="/upload" className="nav-item">
              <i className="fas fa-upload"></i>
              <span>Upload Content</span>
            </NavLink>
          </>
        )}

        <NavLink to="/forum" className="nav-item">
          <i className="fas fa-comments"></i>
          <span>Forum</span>
        </NavLink>
        <NavLink to="/messages" className="nav-item">
          <i className="fas fa-envelope"></i>
          <span>Messages</span>
        </NavLink>
        <NavLink to="/settings" className="nav-item">
          <i className="fas fa-cog"></i>
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="user-actions">
        {user ? (
          <>
            <div className="user-profile">
              <img
                src={
                  user.pfp
                    ? `data:${user.pfp.contentType};base64,${user.pfp.data}`
                    : "https://randomuser.me/api/portraits/men/67.jpg"
                }
                alt="User Avatar"
                className="user-avatar"
              />
              <div className="user-name">
                {`${user.name} ${user.surname ?? ""}`.trim()}
              </div>
            </div>

            <button
              className="logout-btn"
              title="Logout"
              onClick={openLogoutModal}
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </>
        ) : (
          // if you later add a login modal, wire it here
          <NavLink to="/login" className="btn btn-primary btn-sm">
            Login
          </NavLink>
        )}
      </div>

      {/* Mount once so it overlays the whole app */}
      <LogoutConfirmationModal />
    </header>
  );
};

export default Header;
