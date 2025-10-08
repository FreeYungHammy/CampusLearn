import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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
import DatabaseTools from "./pages/DatabaseTools";
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

import { useAuthStore } from "./store/authStore";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";

import "./App.css";

function App() {
  useInactivityLogout();
  useBackendHealth();
  useGlobalSocket();

  const { showLogoutModal } = useAuthStore();

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
              <Route path="/upload" element={<Upload />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/database-tools" element={<DatabaseTools />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {showLogoutModal && <LogoutConfirmationModal />}
    </>
  );
}

export default App;
