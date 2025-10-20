import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { register } from "../../services/authApi";
import "./Login.css";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
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

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
      subjects: [],
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("Required"),
      lastName: Yup.string().required("Required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Required")
        .test(
          "domain",
          "Email must be a student.belgiumcampus.ac.za domain",
          (value) => {
            if (value) {
              return value.endsWith("@student.belgiumcampus.ac.za");
            }
            return true;
          },
        ),
      password: Yup.string()
        .required("Required")
        .test("password-strength", "Password is too weak", (value) => {
          return checkPasswordStrength(value || "") >= 4;
        })
        .test("email-password", "Password cannot be the same as your email address", function(value) {
          const { email } = this.parent;
          if (value && email && value.toLowerCase() === email.toLowerCase()) {
            return false;
          }
          return true;
        }),
      role: Yup.string().required("Required"),
      subjects: Yup.array().min(1, "Select at least one subject"),
    }),
    onSubmit: async (values) => {
      setError("");
      try {
        await register(values);
        navigate("/login?registered=true");
      } catch (err: any) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      }
    },
  });

  const passwordStrength = checkPasswordStrength(formik.values.password);

  const getStrengthText = () => {
    if (formik.values.password.length === 0) {
      return null;
    }
    if (passwordStrength <= 1) {
      return <span style={{ color: "var(--danger)" }}>Weak</span>;
    }
    if (passwordStrength <= 3) {
      return <span style={{ color: "var(--warning)" }}>Moderate</span>;
    }
    if (passwordStrength <= 4) {
      return <span style={{ color: "var(--secondary)" }}>Strong</span>;
    }
    return <span style={{ color: "var(--secondary)" }}>Very Strong</span>;
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

        <form id="register-form" onSubmit={formik.handleSubmit}>
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
              id="firstName"
              name="firstName"
              type="text"
              className={`form-control ${
                formik.touched.firstName && formik.errors.firstName
                  ? "is-invalid"
                  : ""
              }${
                formik.touched.firstName && !formik.errors.firstName
                  ? "is-valid"
                  : ""
              }`}
              placeholder="Enter your first name"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.firstName}
            />
            {formik.touched.firstName && formik.errors.firstName ? (
              <div className="error-message">{formik.errors.firstName}</div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i>
              <span>Last Name</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className={`form-control ${
                formik.touched.lastName && formik.errors.lastName
                  ? "is-invalid"
                  : ""
              }${
                formik.touched.lastName && !formik.errors.lastName
                  ? "is-valid"
                  : ""
              }`}
              placeholder="Enter your last name"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.lastName}
            />
            {formik.touched.lastName && formik.errors.lastName ? (
              <div className="error-message">{formik.errors.lastName}</div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-envelope"></i>
              <span>Email Address</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-control ${
                formik.touched.email && formik.errors.email ? "is-invalid" : ""
              }${
                formik.touched.email && !formik.errors.email ? "is-valid" : ""
              }`}
              placeholder="Enter your email"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="error-message">{formik.errors.email}</div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-lock"></i>
              <span>Password</span>
            </label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${
                  formik.touched.password && formik.errors.password
                    ? "is-invalid"
                    : ""
                }${
                  formik.touched.password && !formik.errors.password
                    ? "is-valid"
                    : ""
                }`}
                placeholder="Create a password"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
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
            <div className="password-strength-text">{getStrengthText()}</div>
            {formik.touched.password && formik.errors.password ? (
              <div className="error-message">{formik.errors.password}</div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-users"></i>
              <span>I want to join as a:</span>
            </label>
            <div className="role-selection">
              <div
                className={`role-option ${formik.values.role === "student" ? "selected" : ""}`}
                onClick={() => formik.setFieldValue("role", "student")}
              >
                <i className="fas fa-user-graduate"></i>
                <h3>Student</h3>
                <p>Learn from peers and tutors</p>
              </div>
              <div
                className={`role-option ${formik.values.role === "tutor" ? "selected" : ""}`}
                onClick={() => formik.setFieldValue("role", "tutor")}
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
                "Mathematics",
                "Linear Programming",
                "Database Development",
                "Web Programming",
                "Computer Architecture",
                "Statistics",
                "Software Testing",
                "Network Development",
                "Machine Learning",
              ].map((subject) => (
                <div key={subject}>
                  <input
                    type="checkbox"
                    id={subject}
                    className="subject-checkbox"
                    name="subjects"
                    value={subject}
                    checked={(formik.values.subjects as string[]).includes(subject)}
                    onChange={formik.handleChange}
                  />
                  <label htmlFor={subject} className="subject-label">
                    <i
                      className={`fas ${
                        {
                          Programming: "fa-code",
                          Mathematics: "fa-calculator",
                          "Linear Programming": "fa-project-diagram",
                          "Database Development": "fa-database",
                          "Web Programming": "fa-laptop-code",
                          "Computer Architecture": "fa-microchip",
                          Statistics: "fa-chart-line",
                          "Software Testing": "fa-bug",
                          "Network Development": "fa-network-wired",
                          "Machine Learning": "fa-robot",
                        }[subject]
                      }
                    `}
                    ></i>
                    <span className="subject-text">{subject}</span>
                  </label>
                </div>
              ))}
            </div>
            {formik.touched.subjects && formik.errors.subjects ? (
              <div className="error-message">{formik.errors.subjects}</div>
            ) : null}
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
