import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-bc-gray">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="xl:col-span-1">
            <Link to="/" className="text-white font-bold text-2xl">
              Campus<span className="text-bc-blue-light">Learn</span>
              <sup className="text-xs">™</sup>
            </Link>
            <p className="mt-2 text-gray-400 text-sm">
              Empowering student success through peer-powered learning at
              Belgium Campus.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                  Platform
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link
                      to="/features"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/pricing"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/forum"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Forum
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/tutors"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Tutors
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                  Support
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link
                      to="/help"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                  Connect
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a
                      href="#"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Facebook
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Instagram
                    </a>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                  Belgium Campus
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a
                      href="https://www.belgiumcampus.ac.za/"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Website
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/careers"
                      className="text-base text-gray-400 hover:text-white"
                    >
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; 2025 CampusLearn™. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
