import React, { useState, useEffect, useCallback } from "react"; // Add useEffect and useCallback
import { useFormik } from "formik";
import * as Yup from "yup";
import { register, checkEmailAvailability } from "../services/authApi";
import Stepper from "./Stepper";
import Dialog from "./ui/Dialog";
import { useNavigate } from "react-router-dom";
import "./RegisterStepperModal.css";

interface RegisterStepperModalProps {
  show: boolean;
  onClose: () => void;
}

const checkPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/)) strength++;
  if (password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  return strength;
};

const getPasswordStrengthText = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return { text: "Weak", color: "#dc3545" };
    case 2:
      return { text: "Moderate", color: "#fd7e14" };
    case 3:
      return { text: "Strong", color: "#28a745" }; // Changed to green
    case 4:
    case 5:
      return { text: "Very Strong", color: "#20c997" };
    default:
      return { text: "Weak", color: "#dc3545" };
  }
};

const RegisterStepperModal: React.FC<RegisterStepperModalProps> = ({
  show,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "prev"
  >("next");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const steps = ["Role", "Details", "Subjects"];

  const validateEmailAvailability = async (email: string) => {
    if (!email || !email.includes("@")) return true;

    setIsCheckingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      console.log("Starting email availability check for:", email);
      const isAvailable = await checkEmailAvailability(email);
      console.log("Email availability result:", isAvailable);
      if (!isAvailable) {
        setEmailError("This email is already registered");
        setEmailSuccess(false);
        return false;
      }
      setEmailSuccess(true);
      setEmailError(null);
      return true;
    } catch (error: any) {
      console.error("Error checking email:", error);
      console.error("Error details:", error.response?.data || error.message);
      // More specific error handling
      if (error.response?.status === 400) {
        setEmailError("Please enter a valid email address");
      } else if (error.response?.status === 500) {
        setEmailError("Server error. Please try again later.");
      } else if (error.code === "NETWORK_ERROR" || !navigator.onLine) {
        setEmailError("Network error. Please check your connection.");
      } else {
        setEmailError("Unable to verify email. Please try again.");
      }
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Debounced email check function
  const debouncedEmailCheck = useCallback(
    (email: string) => {
      // Clear existing timeout
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }

      // Only check if email looks valid
      if (email && email.includes("@") && email.includes(".")) {
        const timeout = setTimeout(() => {
          validateEmailAvailability(email);
        }, 1000); // 1 second delay

        setEmailCheckTimeout(timeout);
      }
    },
    [emailCheckTimeout],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [emailCheckTimeout]);

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Role selection
        return formik.values.role !== "";
      case 2: // Details
        const basicFieldsValid =
          formik.values.firstName.trim() !== "" &&
          formik.values.lastName.trim() !== "" &&
          formik.values.email.trim() !== "" &&
          formik.values.password.trim() !== "";

        // Only block if there's a specific email error (not just network issues)
        const emailBlocking =
          emailError && !emailError.includes("Unable to verify");

        // If role is tutor, also check for qualification file
        if (formik.values.role === "tutor") {
          return (
            basicFieldsValid &&
            formik.values.qualificationFile !== null &&
            !emailBlocking
          );
        }
        return basicFieldsValid && !emailBlocking;
      case 3: // Subjects
        return formik.values.subjects.length > 0;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Special handling for step 2 - check email availability
      if (currentStep === 2 && formik.values.email.trim()) {
        const isEmailAvailable = await validateEmailAvailability(
          formik.values.email,
        );
        if (!isEmailAvailable) {
          formik.setFieldTouched("email", true);
          return; // Don't proceed if email is not available
        }
      }

      // Validate current step before proceeding
      if (!validateCurrentStep()) {
        // Mark relevant fields as touched to show validation errors
        switch (currentStep) {
          case 1:
            // Role selection - this shouldn't happen as role has default value
            break;
          case 2:
            formik.setFieldTouched("firstName", true);
            formik.setFieldTouched("lastName", true);
            formik.setFieldTouched("email", true);
            formik.setFieldTouched("password", true);
            if (formik.values.role === "tutor") {
              formik.setFieldTouched("qualificationFile", true);
            }
            break;
          case 3:
            formik.setFieldTouched("subjects", true);
            break;
        }
        return; // Don't proceed to next step
      }

      setTransitionDirection("next");
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setTransitionDirection("prev");
      setCurrentStep(currentStep - 1);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
      subjects: [],
      qualificationFile: null,
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
        .test(
          "password-strength",
          "Password must be Strong or better",
          (value) => {
            return checkPasswordStrength(value || "") >= 3;
          },
        ),
      role: Yup.string().required("Required"),
      subjects: Yup.array().min(1, "Select at least one subject"),
      qualificationFile: Yup.mixed().when("role", {
        is: "tutor",
        then: (schema) =>
          schema.required("Qualification file is required for tutors"),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    onSubmit: async (values) => {
      setError("");
      try {
        await register(values);
        setRegistrationSuccess(true);
        // Close modal and navigate after showing success message for 2 seconds
        setTimeout(() => {
          onClose();
          navigate("/login?registered=true");
        }, 2500);
      } catch (err: any) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      }
    },
  });

  // Reset function
  const resetForm = () => {
    formik.resetForm();
    setCurrentStep(1);
    setTransitionDirection("next");
    setError("");
    setIsDragOver(false);
  };

  // Handle modal close with reset
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset when modal is closed
  useEffect(() => {
    if (!show) {
      resetForm();
    }
  }, [show]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      formik.setFieldValue("qualificationFile", file);
    }
  };

  return (
    <Dialog isOpen={show} onClose={handleClose} width="lg">
      {" "}
      {/* Change onClose to handleClose */}
      <div className="register-stepper-modal">
        <div className="modal-header">
          <h2 className="modal-title">Create Your Account</h2>
          <button className="modal-close" onClick={handleClose}>
            {" "}
            {/* Change to handleClose */}
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className="modal-body">
            {!registrationSuccess && (
              <Stepper
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            )}
            <div
              className={`step-content ${transitionDirection === "prev" ? "back-transition" : ""}`}
            >
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
              {registrationSuccess && (
                <div className="success-message-container">
                  <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h3 className="success-title">
                    Account Created Successfully!
                  </h3>
                  <p className="success-description">
                    Welcome to CampusLearn! Your account has been created
                    successfully.
                  </p>
                  <p className="success-redirect">
                    Redirecting you to login...
                  </p>
                </div>
              )}
              {!registrationSuccess && currentStep === 1 && (
                <div>
                  <h3 className="step-title">Are you a Student or a Tutor?</h3>
                  <div className="role-selection">
                    <div
                      className={`role-option ${
                        formik.values.role === "student" ? "selected" : ""
                      }`}
                      onClick={() => formik.setFieldValue("role", "student")}
                    >
                      <i className="fas fa-user-graduate"></i>
                      <h3>Student</h3>
                      <p>Learn from peers and tutors</p>
                    </div>
                    <div
                      className={`role-option ${
                        formik.values.role === "tutor" ? "selected" : ""
                      }`}
                      onClick={() => formik.setFieldValue("role", "tutor")}
                    >
                      <i className="fas fa-chalkboard-teacher"></i>
                      <h3>Tutor</h3>
                      <p>Share knowledge and earn</p>
                    </div>
                  </div>
                </div>
              )}
              {!registrationSuccess && currentStep === 2 && (
                <div>
                  <h3 className="step-title">Enter Your Details</h3>
                  <p className="step-description">
                    All fields are required to continue
                  </p>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
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
                      <div className="error-message">
                        {formik.errors.firstName}
                      </div>
                    ) : null}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
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
                      <div className="error-message">
                        {formik.errors.lastName}
                      </div>
                    ) : null}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`form-control ${
                        formik.touched.email && formik.errors.email
                          ? "is-invalid"
                          : ""
                      }${
                        formik.touched.email && !formik.errors.email
                          ? "is-valid"
                          : ""
                      }`}
                      placeholder="Enter your email"
                      onChange={(e) => {
                        formik.handleChange(e);
                        // Clear email error and success when user starts typing
                        if (emailError) {
                          setEmailError(null);
                        }
                        if (emailSuccess) {
                          setEmailSuccess(false);
                        }
                        // Start debounced email check
                        debouncedEmailCheck(e.target.value);
                      }}
                      onBlur={formik.handleBlur}
                      value={formik.values.email}
                    />
                    {formik.touched.email && formik.errors.email ? (
                      <div className="error-message">{formik.errors.email}</div>
                    ) : null}
                    {emailError && (
                      <div className="error-message">{emailError}</div>
                    )}
                    {isCheckingEmail && (
                      <div className="loading-message">
                        <i className="fas fa-spinner fa-spin"></i> Checking
                        email availability...
                      </div>
                    )}
                    {emailSuccess && !isCheckingEmail && (
                      <div className="success-message">
                        <i className="fas fa-check"></i> Email is available
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="password-wrapper">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`form-control password-input ${
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
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={togglePasswordVisibility}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <i
                          className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                        ></i>
                      </button>
                    </div>
                    <div className="password-strength-meter">
                      <div
                        className="strength-bar"
                        data-strength={checkPasswordStrength(
                          formik.values.password,
                        )}
                      ></div>
                    </div>
                    {formik.values.password && (
                      <div
                        className="password-strength-text"
                        style={{
                          color: getPasswordStrengthText(
                            checkPasswordStrength(formik.values.password),
                          ).color,
                        }}
                      >
                        {
                          getPasswordStrengthText(
                            checkPasswordStrength(formik.values.password),
                          ).text
                        }
                      </div>
                    )}
                  </div>

                  {formik.values.role === "tutor" && (
                    <div className="form-group">
                      <label className="form-label">
                        Upload Qualification Document
                      </label>
                      <div className="file-upload-container">
                        <input
                          id="qualificationFile"
                          name="qualificationFile"
                          type="file"
                          className="file-input"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0] || null;
                            formik.setFieldValue("qualificationFile", file);
                          }}
                          onBlur={formik.handleBlur}
                        />
                        <label
                          htmlFor="qualificationFile"
                          className={`file-upload-label ${isDragOver ? "drag-over" : ""}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <i className="fas fa-cloud-upload-alt"></i>
                          <span className="file-upload-text">
                            {formik.values.qualificationFile
                              ? formik.values.qualificationFile.name
                              : "Choose file or drag and drop"}
                          </span>
                          <span className="file-upload-subtext">
                            PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                          </span>
                        </label>
                      </div>
                      {formik.touched.qualificationFile &&
                      formik.errors.qualificationFile ? (
                        <div className="error-message">
                          {formik.errors.qualificationFile}
                        </div>
                      ) : null}
                      {formik.values.qualificationFile && (
                        <div className="file-preview">
                          <i className="fas fa-file"></i>
                          <span>{formik.values.qualificationFile.name}</span>
                          <button
                            type="button"
                            className="file-remove"
                            onClick={() =>
                              formik.setFieldValue("qualificationFile", null)
                            }
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!registrationSuccess && currentStep === 3 && (
                <div>
                  <h3 className="step-title">Select Your Subjects</h3>
                  <p className="step-description">
                    Please select at least one subject to continue
                  </p>
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
                          checked={formik.values.subjects.includes(subject)}
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
                            }`}
                          ></i>
                          <span className="subject-text">{subject}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {currentStep === 3 &&
          formik.touched.subjects &&
          formik.errors.subjects ? (
            <div
              className="error-message"
              style={{ textAlign: "center", padding: "1rem" }}
            >
              {formik.errors.subjects}
            </div>
          ) : null}
          {!registrationSuccess && (
            <div className="modal-actions">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
              )}
              {currentStep < steps.length ? (
                <button
                  type="button"
                  className={`btn btn-primary ${!validateCurrentStep() ? "btn-disabled" : ""}`}
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                >
                  Next
                </button>
              ) : (
                <button type="submit" className="btn btn-primary">
                  Finish
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </Dialog>
  );
};

export default RegisterStepperModal;
