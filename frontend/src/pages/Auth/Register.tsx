import { Link } from "react-router-dom";
import "./Login.css";

const Register = () => {
  return (
    <div className="login-container">
      <div className="logo">
        <div className="logo-icon">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className="logo-text">CampusLearn™</div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Get started with your account</p>
        </div>

        <form id="register-form">
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i>
              <span>Full Name</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-envelope"></i>
              <span>Email Address</span>
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-lock"></i>
              <span>Password</span>
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            <i className="fas fa-user-plus"></i>
            Create Account
          </button>

          <Link to="/login" className="btn btn-outline">
            <i className="fas fa-sign-in-alt"></i>
            Sign In
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Register;
