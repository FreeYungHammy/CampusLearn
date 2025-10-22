import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import "./Login.css";
import { useState } from "react";
import { login } from "../../services/authApi";
import { useAuthStore } from "../../store/authStore";

import NewRegisterStepperModal from "../../components/NewRegisterStepperModal";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
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
      password: Yup.string().required("Required"),
    }),
    onSubmit: async (values) => {
      setError("");
      try {
        const { token, user } = await login(values);
        console.log("Login.tsx: User object received from backend:", user); // Add this line
        setToken(token);
        setUser(user);
        navigate("/schedule");
      } catch (err) {
        setError("Invalid email or password");
      }
    },
  });

  return (
    <div className="auth-page-container">
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
            <p className="login-subtitle">
              Sign in to continue to your account
            </p>
          </div>

          <form id="login-form" onSubmit={formik.handleSubmit}>
            {error && <p className="error-message">{error}</p>}
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
                  formik.touched.email && formik.errors.email
                    ? "is-invalid"
                    : ""
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
                  placeholder="Enter your password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                />
                <i
                  className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
              {formik.touched.password && formik.errors.password ? (
                <div className="error-message">{formik.errors.password}</div>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="fas fa-sign-in-alt"></i>
              Sign In
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRegisterModal(true)}
            >
              <i className="fas fa-user-plus"></i>
              Create New Account
            </button>

            <div className="login-links">
              <a href="#" className="login-link">
                <i className="fas fa-question-circle"></i>
                Need Help?
              </a>
              <Link to="/forgot-password" className="login-link">
                <i className="fas fa-key"></i>
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>
      </div>
      <NewRegisterStepperModal
        show={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      />
    </div>
  );
};

export default Login;
