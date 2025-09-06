import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
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
import "./App.css";

const Messages = React.lazy(() => import("./pages/Messages"));

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="*"
          element={
            <>
              <Header />
              <main className="content">
                <Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
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
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
