import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

type Theme = "light" | "dark";

const Header = () => {
  const user = useAuthStore((s) => s.user);
  const openLogoutModal = useAuthStore((s) => s.openLogoutModal);
  const isTutor = user?.role === "tutor";

  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (menuRef.current && t && !menuRef.current.contains(t))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Theme boot + persist
  useEffect(() => {
    const stored = localStorage.getItem("cl-theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia?.(
        "(prefers-color-scheme: dark)",
      )?.matches;
      const initial: Theme = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cl-theme", next);
  };

  return (
    <>
      {/* Full-bleed header with inner container */}
      <header className="cl-bleed-header">
        <div className="cl-header-inner">
          {/* Left: Brand */}
          <div className="cl-left">
            <Link to="/" className="cl-brand" aria-label="CampusLearn Home">
              <span className="cl-brand__icon">
                <i className="fas fa-graduation-cap" aria-hidden="true" />
              </span>
              <span className="cl-brand__text">CampusLearn™</span>
            </Link>
          </div>

          {/* Center: Primary nav (Messages now in main nav) */}
          <nav className="cl-center" aria-label="Primary">
            <NavLink to="/schedule" className="cl-nav-item">
              <i className="fas fa-calendar" />
              <span>Schedule</span>
            </NavLink>

            {!isTutor && (
              <>
                <NavLink to="/mytutors" className="cl-nav-item">
                  <i className="fas fa-user-friends" />
                  <span>My Tutors</span>
                </NavLink>
                <NavLink to="/tutors" className="cl-nav-item">
                  <i className="fas fa-user-graduate" />
                  <span>Find Tutors</span>
                </NavLink>
              </>
            )}

            {isTutor && (
              <>
                <NavLink to="/mystudents" className="cl-nav-item">
                  <i className="fas fa-users" />
                  <span>My Students</span>
                </NavLink>
                <NavLink to="/mycontent" className="cl-nav-item">
                  <i className="fas fa-folder" />
                  <span>My Content</span>
                </NavLink>
                <NavLink to="/upload" className="cl-nav-item">
                  <i className="fas fa-upload" />
                  <span>Upload Content</span>
                </NavLink>
              </>
            )}

            <NavLink to="/forum" className="cl-nav-item">
              <i className="fas fa-comments" />
              <span>Forum</span>
            </NavLink>

            {/* NEW: Messages in the main nav */}
            <NavLink to="/messages" className="cl-nav-item">
              <i className="fas fa-envelope" />
              <span>Messages</span>
            </NavLink>
          </nav>

          {/* Right: Logout icon + Profile menu (theme toggle moved inside) */}
          <div className="cl-right" ref={menuRef}>
            {/* Always-visible logout icon */}
            {user && (
              <button
                type="button"
                className="logout-btn"
                title="Logout"
                aria-label="Logout"
                onClick={openLogoutModal}
              >
                <i className="fas fa-sign-out-alt" />
              </button>
            )}

            {user && (
              <>
                <button
                  type="button"
                  className="cl-profile-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  title="Account menu"
                >
                  <img
                    src={
                      user.pfp
                        ? `data:${user.pfp.contentType};base64,${user.pfp.data}`
                        : "https://randomuser.me/api/portraits/men/67.jpg"
                    }
                    alt="User Avatar"
                    className="user-avatar"
                  />
                  <span className="user-name">
                    {`${user.name} ${user.surname ?? ""}`.trim()}
                  </span>
                  <i
                    className={`fas fa-chevron-${menuOpen ? "up" : "down"} cl-caret`}
                  />
                </button>

                {menuOpen && (
                  <div className="cl-menu" role="menu">
                    {/* Theme toggle moved into dropdown */}
                    <button
                      role="menuitemcheckbox"
                      aria-checked={theme === "dark"}
                      className="cl-menu__item"
                      onClick={() => {
                        toggleTheme();
                        // keep menu open so user sees the state change
                      }}
                      title="Toggle dark mode"
                    >
                      {theme === "dark" ? (
                        <i className="fas fa-sun" aria-hidden="true" />
                      ) : (
                        <i className="fas fa-moon" aria-hidden="true" />
                      )}
                      <span>Dark mode</span>
                    </button>

                    <NavLink
                      to="/settings"
                      role="menuitem"
                      className="cl-menu__item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className="fas fa-cog" />
                      <span>Settings</span>
                    </NavLink>

                    <button
                      role="menuitem"
                      className="cl-menu__item"
                      onClick={() => {
                        setMenuOpen(false);
                        openLogoutModal();
                      }}
                    >
                      <i className="fas fa-sign-out-alt" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mount once so it overlays the whole app */}
      <LogoutConfirmationModal />
    </>
  );
};

export default Header;
