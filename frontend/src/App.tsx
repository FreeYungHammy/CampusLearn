import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import MyTutors from "./pages/MyTutors";
import FindTutors from "./pages/FindTutors";
import FindTutorsWrapper from "./components/FindTutorsWrapper";
import MyStudents from "./pages/MyStudents";
import MyContent from "./pages/MyContent";
import Forum from "./pages/Forum";
import ForumTopic from "./pages/ForumTopic";
import Upload from "./pages/Upload";
import TutorContentView from "./pages/Tutors/TutorContentView";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AdminTutorApplications from "./pages/AdminTutorApplications";
import DatabaseTools from "./pages/DatabaseTools";
import Bookings from "./pages/Bookings";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";

const Messages = React.lazy(() => import("./pages/Messages"));

import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useGlobalSocket } from "./hooks/useGlobalSocket";
import { useCallNotifications } from "./hooks/useCallNotifications";
import { SocketManager } from "./services/socketManager";
import { getWsUrl } from "./config/env";

import { useAuthStore } from "./store/authStore";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";

import BotpressChat from "./components/BotpressChat/BotpressChat";

import { VideoCallPage } from "./pages/Call/VideoCallPage";
import { CallNotification } from "./components/CallNotification";


function App() {
  const location = useLocation();
  const { showLogoutModal, user, token } = useAuthStore();
  
  useInactivityLogout();
  useBackendHealth();
  useGlobalSocket();
  useCallNotifications();

  // Initialize SocketManager when user is authenticated
  React.useEffect(() => {
    if (token && user) {
      console.log("[App] Initializing SocketManager with token and user");
      SocketManager.initialize({
        url: getWsUrl(),
        token: token,
      });
    }
  }, [token, user]);
  const isCallPopup = location.pathname.startsWith("/call/");

  return (
    <>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Popup call route - standalone, no Layout shell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/call/:callId" element={<VideoCallPage />} />
          </Route>

          {/* Private routes */}
          <Route element={<ProtectedRoute />}>
            {/* Layout provides the full-bleed header/footer and an <Outlet /> */}
            <Route element={<Layout />}>
              <Route path="/schedule" element={<Dashboard />} />
              <Route path="/mytutors" element={<MyTutors />} />
              <Route path="/tutors" element={<FindTutorsWrapper />} />
              <Route
                path="/tutors/:tutorId/content"
                element={<TutorContentView />}
              />
              <Route path="/mystudents" element={<MyStudents />} />
              <Route path="/mycontent" element={<MyContent />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/:threadId" element={<ForumTopic />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route
                path="/admin/tutor-applications"
                element={<AdminTutorApplications />}
              />
              <Route path="/database-tools" element={<DatabaseTools />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {!location.pathname.startsWith('/call/') && <BotpressChat />}
      {showLogoutModal && <LogoutConfirmationModal />}

      {/* Call Notifications */}
      {!isCallPopup && <CallNotification />}

      {/* Floating Chat Widget */}
    </>
  );
}

export default App;
