import { useParams, Link } from "react-router-dom";

// Mock data - in a real app, you'd fetch this based on the id
const tutors = [
  {
    id: 1,
    name: "Sarah Johnson",
    course: "BCom IT • 3rd Year",
    specialties: ["Programming", "Databases", "Web Development"],
    availability: "Evenings and weekends",
    rating: 4.9,
    reviews: 87,
    imageUrl:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    bio: "A passionate programmer with a knack for simplifying complex topics. I enjoy helping students build a strong foundation in software development.",
  },
  // ... other tutors
];

const TutorProfile = () => {
  const { id } = useParams();
  const tutor = tutors.find((t) => t.id === parseInt(id || ""));

  if (!tutor) {
    return <div>Tutor not found</div>;
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="px-4 sm:px-0">
              <img
                className="h-48 w-48 rounded-full"
                src={tutor.imageUrl}
                alt={tutor.name}
              />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                {tutor.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{tutor.course}</p>
              <div className="mt-4 flex items-center">
                <span className="text-yellow-500">{tutor.rating} ★</span>
                <span className="ml-2 text-sm text-gray-500">
                  ({tutor.reviews} reviews)
                </span>
              </div>
              <div className="mt-6">
                <button className="w-full bg-bc-blue text-white py-2 px-4 rounded-md hover:bg-bc-blue-light">
                  Request a Session
                </button>
              </div>
            </div>
          </div>
          <div className="mt-12 lg:mt-0 lg:col-span-2">
            <div className="bg-gray-50 shadow sm:rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">About Me</h3>
              <p className="mt-4 text-gray-600">{tutor.bio}</p>

              <h3 className="mt-8 text-lg font-medium text-gray-900">
                Specialties
              </h3>
              <div className="mt-4 flex flex-wrap">
                {tutor.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="mr-2 mb-2 bg-blue-100 text-bc-blue px-3 py-1 rounded-full text-sm"
                  >
                    {specialty}
                  </span>
                ))}
              </div>

              <h3 className="mt-8 text-lg font-medium text-gray-900">
                Availability
              </h3>
              <p className="mt-4 text-gray-600">{tutor.availability}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;
