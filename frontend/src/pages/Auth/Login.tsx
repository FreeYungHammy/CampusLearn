import { Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
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
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue to your account</p>
        </div>

        <form id="login-form">
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
            <i className="fas fa-sign-in-alt"></i>
            Sign In
          </button>

          <Link to="/register" className="btn btn-outline">
            <i className="fas fa-user-plus"></i>
            Create New Account
          </Link>

          <div className="login-links">
            <a href="#" className="login-link">
              <i className="fas fa-question-circle"></i>
              Need Help?
            </a>
            <a href="#" className="login-link">
              <i className="fas fa-key"></i>
              Forgot Password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
