import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import TutorList from "../pages/Tutors/TutorList";
import TutorProfile from "../pages/Tutors/TutorProfile";
import TutorContentView from "../pages/Tutors/TutorContentView";
import Threads from "../pages/Forum/Threads";
import ChatRoom from "../pages/Chat/ChatRoom";
import NotFound from "./NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "tutors", element: <TutorList /> },
      { path: "tutors/:id", element: <TutorProfile /> },
      { path: "tutors/:tutorId/content", element: <TutorContentView /> },
      { path: "forum", element: <Threads /> },
      { path: "chat", element: <ChatRoom /> },
    ],
    errorElement: <NotFound />,
  },
]);
