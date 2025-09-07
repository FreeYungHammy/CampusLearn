import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MyTutors from "./pages/MyTutors";
import FindTutors from "./pages/FindTutors";
import MyStudents from "./pages/MyStudents";
import MyContent from "./pages/MyContent";
import Forum from "./pages/Forum";
import ForumTopic from "./pages/ForumTopic";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";

import "./App.css";

const Messages = React.lazy(() => import("./pages/Messages"));

import { useInactivityLogout } from "./hooks/useInactivityLogout";

import { useAuthStore } from "./store/authStore";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";

function App() {
  useInactivityLogout();
  const { showLogoutModal, logout, closeLogoutModal } = useAuthStore();

  return (
    <div className="App">
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/schedule" element={<Dashboard />} />
              <Route path="/mytutors" element={<MyTutors />} />
              <Route path="/tutors" element={<FindTutors />} />
              <Route path="/mystudents" element={<MyStudents />} />
              <Route path="/mycontent" element={<MyContent />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/:topicId" element={<ForumTopic />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/schedule" />} />
        </Routes>
      </Suspense>
      {showLogoutModal && (
        <LogoutConfirmationModal
          onConfirm={logout}
          onCancel={closeLogoutModal}
        />
      )}
    </div>
  );
}

export default App;
