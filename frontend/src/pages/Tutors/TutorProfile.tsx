import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getTutorById } from "@/services/tutorApi";
import { useState, useEffect } from "react";
import type { Tutor } from "@/types/Tutors";

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutor = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const tutorData = await getTutorById(id);
        setTutor(tutorData);
      } catch (err) {
        console.error("Error fetching tutor:", err);
        setError("Failed to load tutor profile");
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tutor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Tutor Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The tutor you're looking for doesn't exist."}</p>
          <Link to="/tutors" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Back to Tutors
          </Link>
        </div>
      </div>
    );
  }

  const handleStartChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to messages page - the chat will be initiated when user selects the conversation
    navigate('/messages');
  };

  const pfpSrc = tutor.pfp 
    ? `data:${tutor.pfp.contentType};base64,${tutor.pfp.data}`
    : "https://randomuser.me/api/portraits/men/67.jpg";

  const rating = tutor.rating && tutor.rating.count > 0 
    ? (tutor.rating.totalScore / tutor.rating.count).toFixed(1)
    : "No rating";

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="px-4 sm:px-0">
              <img
                className="h-48 w-48 rounded-full object-cover"
                src={pfpSrc}
                alt={`${tutor.name} ${tutor.surname}`}
              />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                {tutor.name} {tutor.surname}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {tutor.studentCount} student{tutor.studentCount !== 1 ? 's' : ''}
              </p>
              <div className="mt-4 flex items-center">
                <span className="text-yellow-500">{rating} ★</span>
                <span className="ml-2 text-sm text-gray-500">
                  ({tutor.rating?.count || 0} reviews)
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <button className="w-full bg-bc-blue text-white py-2 px-4 rounded-md hover:bg-bc-blue-light">
                  Request a Session
                </button>
                <button 
                  onClick={handleStartChat}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-comments mr-2"></i>
                  Start Chat
                </button>
              </div>
            </div>
          </div>
          <div className="mt-12 lg:mt-0 lg:col-span-2">
            <div className="bg-gray-50 shadow sm:rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">About Me</h3>
              <p className="mt-4 text-gray-600">
                Experienced tutor specializing in {tutor.subjects.join(", ").toLowerCase()}.
              </p>

              <h3 className="mt-8 text-lg font-medium text-gray-900">
                Subjects
              </h3>
              <div className="mt-4 flex flex-wrap">
                {tutor.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="mr-2 mb-2 bg-blue-100 text-bc-blue px-3 py-1 rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>

              <h3 className="mt-8 text-lg font-medium text-gray-900">
                Student Count
              </h3>
              <p className="mt-4 text-gray-600">
                Currently helping {tutor.studentCount} student{tutor.studentCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;
