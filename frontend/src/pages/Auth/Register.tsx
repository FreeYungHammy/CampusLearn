import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../services/authApi";
import "./Login.css";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubjectChange = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        role,
        subjects,
      });
      // On success, navigate to the login page with a success message
      navigate("/login?registered=true");
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

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
          <h1 className="login-title">Create Your Account</h1>
          <p className="login-subtitle">
            Join our peer-powered learning community
          </p>
        </div>

        <form id="register-form" onSubmit={handleSubmit}>
          {error && (
            <p
              className="error-message"
              style={{
                color: "red",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {error}
            </p>
          )}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i>
              <span>First Name</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your first name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i>
              <span>Last Name</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your last name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-lock"></i>
              <span>Password</span>
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Create a password"
                required
                value={password}
                onChange={handlePasswordChange}
              />
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
            <div className="password-strength-meter">
              <div
                className="strength-bar"
                data-strength={passwordStrength}
              ></div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-users"></i>
              <span>I want to join as a:</span>
            </label>
            <div className="role-selection">
              <div
                className={`role-option ${role === "student" ? "selected" : ""}`}
                onClick={() => setRole("student")}
              >
                <i className="fas fa-user-graduate"></i>
                <h3>Student</h3>
                <p>Learn from peers and tutors</p>
              </div>
              <div
                className={`role-option ${role === "tutor" ? "selected" : ""}`}
                onClick={() => setRole("tutor")}
              >
                <i className="fas fa-chalkboard-teacher"></i>
                <h3>Tutor</h3>
                <p>Share knowledge and earn</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-book"></i>
              <span>Select Subjects</span>
            </label>
            <div className="subjects-container">
              {[
                "Programming",
                "Math",
                "Linear Programming",
                "Database",
                "Web Programming",
              ].map((subject) => (
                <div key={subject}>
                  <input
                    type="checkbox"
                    id={subject}
                    className="subject-checkbox"
                    name="subjects"
                    value={subject}
                    checked={subjects.includes(subject)}
                    onChange={() => handleSubjectChange(subject)}
                  />
                  <label htmlFor={subject} className="subject-label">
                    <i
                      className={`fas ${
                        {
                          Programming: "fa-code",
                          Math: "fa-calculator",
                          "Linear Programming": "fa-project-diagram",
                          Database: "fa-database",
                          "Web Programming": "fa-laptop-code",
                        }[subject]
                      }
                    `}
                    ></i>
                    {subject}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <i className="fas fa-user-plus"></i>
            Create Account
          </button>

          <div
            className="login-link"
            style={{ textAlign: "center", marginTop: "20px" }}
          >
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
