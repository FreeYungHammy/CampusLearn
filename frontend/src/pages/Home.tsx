import { Link } from "react-router-dom";

const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-bc-blue to-bc-blue-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                Empowering Student Success Through Peer-Powered Learning
              </h1>
              <p className="mt-4 text-xl text-blue-100">
                Connect with peer tutors, access learning resources, and
                collaborate with fellow students—all in one platform.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row sm:space-x-4">
                <Link
                  to="/tutors"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-bc-blue bg-white hover:bg-blue-50"
                >
                  Find a Tutor
                </Link>
                <Link
                  to="/topics"
                  className="mt-3 sm:mt-0 inline-flex items-center justify-center px-5 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-bc-blue"
                >
                  Browse Topics
                </Link>
              </div>
            </div>
            <div className="mt-10 md:mt-0 md:w-1/2 flex justify-center">
              <img
                src="/src/assets/hero-image.svg"
                alt="Peer learning"
                className="w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-bc-blue tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need for academic success
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-user-graduate text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Peer Tutor Matching
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Get matched with qualified peer tutors based on your
                      specific academic needs and course requirements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-comments text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      AI-Powered Assistant
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      24/7 AI tutor support with smart escalation to human
                      tutors when needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-book-open text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Learning Resources
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Access a vast library of study materials, videos, and
                      interactive exercises.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-users text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Public Forum
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Join academic discussions anonymously and get help from
                      the entire student community.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-comment-dots text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Private Messaging
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      One-on-one academic support with secure private messaging
                      between students and tutors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-bc-blue rounded-md shadow-lg">
                        <i className="fas fa-bell text-white text-2xl"></i>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Smart Notifications
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Get alerts via email, SMS, or WhatsApp for new responses
                      and tutor availability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-bc-blue">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to improve your grades?</span>
            <span className="block text-bc-blue-light">
              Join CampusLearn today.
            </span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-bc-blue bg-white hover:bg-blue-50"
              >
                Get started
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                to="/features"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-bc-blue-light hover:bg-blue-700"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
