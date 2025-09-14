import { Link, useParams, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import "./Login.css";
import { useState } from "react";
import { resetPassword } from "../../services/authApi";

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthLabel = [
    "Very Weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very Strong",
  ][strength];
  const strengthColor = [
    "#ff4d4d",
    "#ff794d",
    "#ffc24d",
    "#a6ff4d",
    "#52ff4d",
    "#00ff00",
  ][strength];

  return (
    <div className="password-strength-indicator">
      <div
        className="strength-bar"
        style={{
          width: `${(strength / 5) * 100}%`,
          backgroundColor: strengthColor,
        }}
      ></div>
      <div className="strength-label">{strengthLabel}</div>
    </div>
  );
};

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { token } = useParams();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .required("Required")
        .min(8, "Password must be at least 8 characters"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords must match")
        .required("Required"),
    }),
    onSubmit: async (values) => {
      setError("");
      setMessage("");
      try {
        await resetPassword(token, values.password);
        setMessage("Password has been reset successfully.");
        setTimeout(() => navigate("/login"), 3000);
      } catch (err) {
        setError("Invalid or expired token.");
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
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">Enter your new password</p>
          </div>

          <form id="login-form" onSubmit={formik.handleSubmit}>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-lock"></i>
                <span>New Password</span>
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
                  placeholder="Enter your new password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                />
                <i
                  className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
              <PasswordStrengthIndicator password={formik.values.password} />
              {formik.touched.password && formik.errors.password ? (
                <div className="error-message">{formik.errors.password}</div>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-lock"></i>
                <span>Confirm New Password</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`form-control ${
                  formik.touched.confirmPassword &&
                  formik.errors.confirmPassword
                    ? "is-invalid"
                    : ""
                }${
                  formik.touched.confirmPassword &&
                  !formik.errors.confirmPassword
                    ? "is-valid"
                    : ""
                }`}
                placeholder="Confirm your new password"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.confirmPassword}
              />
              {formik.touched.confirmPassword &&
              formik.errors.confirmPassword ? (
                <div className="error-message">
                  {formik.errors.confirmPassword}
                </div>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save"></i>
              Reset Password
            </button>

            <Link to="/login" className="btn btn-outline">
              <i className="fas fa-arrow-left"></i>
              Back to Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
