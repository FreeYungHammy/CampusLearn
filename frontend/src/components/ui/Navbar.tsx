import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-bc-blue font-bold text-2xl">
                Campus<span className="text-bc-blue-light">Learn</span>
                <sup className="text-xs">™</sup>
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                to="/"
                className="nav-link text-bc-blue border-bc-blue inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                Home
              </Link>
              <Link
                to="/forum"
                className="nav-link text-gray-500 hover:text-bc-blue inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                Forum
              </Link>
              <Link
                to="/tutors"
                className="nav-link text-gray-500 hover:text-bc-blue inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                Tutors
              </Link>
              <Link
                to="/topics"
                className="nav-link text-gray-500 hover:text-bc-blue inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                Topics
              </Link>
              <Link
                to="/chat"
                className="nav-link text-gray-500 hover:text-bc-blue inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                Chat
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-bc-blue hover:bg-bc-blue-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bc-blue">
                <i className="fas fa-comment-dots mr-2"></i> AI Assistant
              </button>
            </div>
            <div className="ml-3 relative">
              <div>
                <button className="bg-gray-100 p-1 rounded-full text-gray-400 hover:text-bc-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bc-blue">
                  <img
                    className="h-8 w-8 rounded-full"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
