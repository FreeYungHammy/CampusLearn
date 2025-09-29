import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { studentApi, type SubscribedStudent } from "@/services/studentApi";
import { chatApi } from "@/services/chatApi";
import { getTutorByUserId } from "@/services/tutorApi";
import { useNavigate } from "react-router-dom";

const MyStudents = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [students, setStudents] = useState<SubscribedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<Map<string, boolean>>(new Map());

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
        const fetchedStudents = await studentApi.getSubscribedStudents(tutor.id, token);
        setStudents(fetchedStudents);

        const statusMap = new Map<string, boolean>();
        for (const student of fetchedStudents) {
          const { exists } = await chatApi.conversationExists(user.id, student.userId, token);
          statusMap.set(student.userId, exists);
        }
        setConversationStatus(statusMap);
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
      const newConversation = await chatApi.createConversation(studentUserId, user.id, token);
      // Navigate to messages page with the new conversation selected
      navigate("/messages", { state: { selectedConversationUserId: studentUserId } });
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
      <h2 className="section-title">
        <i className="fas fa-users"></i>My Students
      </h2>
      <div className="students-grid">
        {students.length === 0 ? (
          <p>No subscribed students found.</p>
        ) : (
          students.map((student) => (
            <div className="student-card" key={student._id}>
              <div className="student-header">
                <div className="student-avatar">
                  {student.pfp ? (
                    <img
                      src={`data:${student.pfp.contentType};base64,${student.pfp.data}`}
                      alt={`${student.name} ${student.surname}`}
                    />
                  ) : (
                    `${student.name.charAt(0)}${student.surname.charAt(0)}`
                  )}
                </div>
                <div className="student-name">{`${student.name} ${student.surname}`}</div>
                <div className="student-course">{student.email}</div>
              </div>
              <div className="student-details">
                <div className="student-stats">
                  {/* You can add real stats here if available */}
                  <div className="stat">
                    <div className="stat-value">N/A</div>
                    <div className="stat-label">Sessions</div>
                  </div>
                </div>
                {conversationStatus.get(student.userId) ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate("/messages", { state: { selectedConversationUserId: student.userId } })}
                  >
                    View Chat
                  </button>
                ) : (
                  <button
                    className="btn btn-outline"
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