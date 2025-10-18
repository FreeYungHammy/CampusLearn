import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import "./Login.css";
import { useState } from "react";
import { forgotPassword } from "../../services/authApi";

const ForgotPassword = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formik = useFormik({
    initialValues: {
      email: "",
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
    }),
    onSubmit: async (values) => {
      setError("");
      setMessage("");
      try {
        await forgotPassword(values.email);
        setMessage("Password reset link sent to your email. Please check your spam/junk folder if you don't see it in your inbox.");
      } catch (err) {
        setError("Error sending password reset link.");
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
            <h1 className="login-title">Forgot Password</h1>
            <p className="login-subtitle">
              Enter your email to receive a password reset link
            </p>
          </div>

          <form id="login-form" onSubmit={formik.handleSubmit}>
            {message && <p className="success-message">{message}</p>}
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

            <button type="submit" className="btn btn-primary">
              <i className="fas fa-paper-plane"></i>
              Send Reset Link
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

export default ForgotPassword;
