import { Link } from "react-router-dom";

const tutors = [
  {
    id: 1,
    name: "Sarah Johnson",
    course: "BCom IT • 3rd Year",
    specialties:
      "Programming fundamentals, database systems, and web development.",
    availability: "Available for evening sessions.",
    rating: 4.9,
    reviews: 87,
    imageUrl:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: 2,
    name: "Michael Chen",
    course: "BIT • 2nd Year",
    specialties: "Mathematics, algorithms, and data structures.",
    availability: "Patient and thorough explanations for complex concepts.",
    rating: 4.8,
    reviews: 63,
    imageUrl:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: 3,
    name: "Amanda Williams",
    course: "Diploma • Final Year",
    specialties:
      "Networking, system administration, and cybersecurity concepts.",
    availability: "Flexible scheduling available.",
    rating: 4.9,
    reviews: 92,
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

const TutorList = () => {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-bc-blue tracking-wide uppercase">
            Tutors
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Meet Our Peer Tutors
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Qualified students ready to help you succeed in your courses.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {tutors.map((tutor) => (
            <div
              key={tutor.id}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <img
                    className="h-48 w-full object-cover md:w-48"
                    src={tutor.imageUrl}
                    alt={tutor.name}
                  />
                </div>
                <div className="p-8">
                  <div className="uppercase tracking-wide text-sm text-bc-blue font-semibold">
                    {tutor.course}
                  </div>
                  <Link
                    to={`/tutors/${tutor.id}`}
                    className="block mt-1 text-lg font-medium text-gray-900"
                  >
                    {tutor.name}
                  </Link>
                  <p className="mt-2 text-gray-500">{tutor.specialties}</p>
                  <div className="mt-4">
                    <span className="text-gray-600 text-sm">
                      {tutor.rating} ★ ({tutor.reviews} reviews)
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/tutors/${tutor.id}`}
                      className="text-sm text-bc-blue hover:text-bc-blue-light font-medium"
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorList;
