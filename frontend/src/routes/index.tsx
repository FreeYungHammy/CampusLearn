import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LandingPage from "../pages/LandingPage";
import Home from "../pages/Home";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import FindTutors from "../pages/FindTutors";
import TutorList from "../pages/Tutors/TutorList";
import TutorProfile from "../pages/Tutors/TutorProfile";
import TutorContentView from "../pages/Tutors/TutorContentView";
import Threads from "../pages/Forum/Threads";
import ForumTopic from "../pages/ForumTopic";
import ChatRoom from "../pages/Chat/ChatRoom";
import Messages from "../pages/Messages";
import NotFound from "./NotFound";
import { VideoCallPage } from "../pages/Call/VideoCallPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "home", element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "find-tutors", element: <FindTutors /> },
      { path: "tutors", element: <FindTutors /> },
      { path: "tutors/:id", element: <TutorProfile /> },
      { path: "tutors/:tutorId/content", element: <TutorContentView /> },
      { path: "forum", element: <Threads /> },
      { path: "forum/:threadId", element: <ForumTopic /> },
      { path: "chat", element: <ChatRoom /> },
      { path: "messages", element: <Messages /> },
    ],
    errorElement: <NotFound />,
  },
  {
    path: "/call/:callId",
    element: <VideoCallPage />, // standalone route (popup window)
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
