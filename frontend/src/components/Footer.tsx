import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div>© 2025 CampusLearn™ - Peer-Powered Learning Platform</div>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/about">About</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
