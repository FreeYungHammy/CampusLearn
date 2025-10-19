import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { studentApi, type SubscribedStudent } from "@/services/studentApi";
import { chatApi } from "@/services/chatApi";
import { getTutorByUserId } from "@/services/tutorApi";
import { getStudentByUserId } from "@/services/bookingApi";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";

const MyStudents = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [students, setStudents] = useState<SubscribedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<
    Map<string, boolean>
  >(new Map());
  const [pfpTimestamps, setPfpTimestamps] = useState<{
    [userId: string]: number;
  }>({});
  const [studentSubjects, setStudentSubjects] = useState<{
    [userId: string]: string[];
  }>({});

  useEffect(() => {
    if (!user?.id || !token || user.role !== "tutor") {
      setLoading(false);
      setError("You must be a logged-in tutor to view this page.");
      return;
    }

    const fetchStudentsAndConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get the tutor's MongoDB _id using their userId
        const tutor = await getTutorByUserId(user.id);
        if (!tutor || !tutor.id) {
          throw new Error("Tutor profile not found");
        }

        // Now use the tutor's MongoDB _id to get subscribed students
        const fetchedStudents = await studentApi.getSubscribedStudents(
          tutor.id,
        );
        setStudents(fetchedStudents);

        // Initialize pfp timestamps for cache busting
        const timestamps = fetchedStudents.reduce(
          (acc: { [userId: string]: number }, student: any) => {
            if (student.pfpTimestamp) {
              acc[student.userId] = student.pfpTimestamp;
            }
            return acc;
          },
          {} as { [userId: string]: number },
        );
        setPfpTimestamps(timestamps);

        const statusMap = new Map<string, boolean>();
        const subjectsMap: { [userId: string]: string[] } = {};

        for (const student of fetchedStudents) {
          const { exists } = await chatApi.conversationExists(
            user.id,
            student.userId,
            token,
          );
          statusMap.set(student.userId, exists);

          // Fetch student subjects
          try {
            const studentData = await getStudentByUserId(student.userId);
            subjectsMap[student.userId] = studentData.enrolledCourses || [];
          } catch (error) {
            console.warn(
              `Failed to fetch subjects for student ${student.userId}:`,
              error,
            );
            subjectsMap[student.userId] = [];
          }
        }

        setConversationStatus(statusMap);
        setStudentSubjects(subjectsMap);
      } catch (err) {
        console.error("Failed to fetch students or conversation status:", err);
        setError("Failed to load students or conversation status.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndConversations();
  }, [user?.id, user?.role, token]);

  const handleStartChat = async (studentUserId: string) => {
    if (!user?.id || !token) {
      setError("Authentication required to start a chat.");
      return;
    }
    try {
      // Create conversation on backend
      const newConversation = await chatApi.createConversation(
        studentUserId,
        user.id,
        token,
      );
      // Navigate to messages page with the new conversation selected
      navigate("/messages", {
        state: { selectedConversationUserId: studentUserId },
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Failed to start conversation.");
    }
  };

  if (loading) {
    return (
      <div className="content-view" id="mystudents-view">
        <h2 className="section-title">
          <i className="fas fa-users"></i>My Students
        </h2>
        <div className="students-grid">Loading students...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-view" id="mystudents-view">
        <h2 className="section-title">
          <i className="fas fa-users"></i>My Students
        </h2>
        <div className="students-grid error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="content-view" id="mystudents-view">
      <PageHeader
        title="My Students"
        subtitle="Manage your subscribed students and track their progress"
        icon="fas fa-users"
      />
      <div className="students-grid">
        {students.length === 0 ? (
          <p>No subscribed students found.</p>
        ) : (
          students.map((student) => (
            <div className="student-card" key={student._id}>
              <div className="student-header">
                <div className="student-avatar">
                  <img
                    src={(() => {
                      const url = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/api/users/${student.userId}/pfp?t=${pfpTimestamps[student.userId] || 0}`;
                      console.log(
                        "🖼️ MyStudents Profile Picture URL:",
                        url,
                        "for student:",
                        student.name,
                      );
                      return url;
                    })()}
                    alt={`${student.name} ${student.surname}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiMzNDk4REIiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJ3aGl0ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBDMTMgMzcgMCA0MCAwIDQwSDQwQzQwIDQwIDI3IDM3IDIwIDBaIiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSIxMCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==";
                    }}
                    onLoad={() => {
                      console.log(
                        "✅ Profile picture loaded for student:",
                        student.userId,
                        student.name,
                      );
                    }}
                  />
                </div>
                <div className="student-name">{`${student.name} ${student.surname}`}</div>
                <div className="student-course">{student.email}</div>
              </div>
              <div className="student-details">
                <div className="student-subjects">
                  <div className="subjects-label">Subjects</div>
                  <div className="subjects-list">
                    {studentSubjects[student.userId] &&
                    studentSubjects[student.userId].length > 0 ? (
                      studentSubjects[student.userId].map((subject, index) => (
                        <span key={index} className="subject-tag">
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="no-subjects">No subjects enrolled</span>
                    )}
                  </div>
                </div>
                {conversationStatus.get(student.userId) ? (
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      navigate("/messages", {
                        state: { selectedConversationUserId: student.userId },
                      })
                    }
                  >
                    View Chat
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleStartChat(student.userId)}
                  >
                    Start Chat
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyStudents;
