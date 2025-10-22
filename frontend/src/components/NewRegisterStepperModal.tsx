import React, { useState, useEffect, useCallback } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  register,
  checkEmailAvailability,
  submitTutorApplication,
} from "../services/authApi";
import Dialog from "./ui/Dialog";
import { useNavigate } from "react-router-dom";
import "./NewRegisterStepperModal.css";

interface NewRegisterStepperModalProps {
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
      return { text: "Weak", color: "#ef4444" };
    case 2:
      return { text: "Moderate", color: "#f59e0b" };
    case 3:
      return { text: "Strong", color: "#10b981" };
    case 4:
    case 5:
      return { text: "Very Strong", color: "#059669" };
    default:
      return { text: "Weak", color: "#ef4444" };
  }
};

const NewRegisterStepperModal: React.FC<NewRegisterStepperModalProps> = ({
  show,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const steps = ["Role", "Details", "Subjects"];

  const validateEmailAvailability = async (email: string) => {
    if (!email || !email.includes("@")) return true;

    setIsCheckingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const isAvailable = await checkEmailAvailability(email);
      if (!isAvailable) {
        setEmailError("This email is already registered");
        setEmailSuccess(false);
        return false;
      }
      setEmailSuccess(true);
      setEmailError(null);
      return true;
    } catch (error: any) {
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

  const debouncedEmailCheck = useCallback(
    (email: string) => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }

      if (email && email.includes("@") && email.includes(".")) {
        const timeout = setTimeout(() => {
          validateEmailAvailability(email);
        }, 1000);

        setEmailCheckTimeout(timeout);
      }
    },
    [emailCheckTimeout],
  );

  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [emailCheckTimeout]);

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return formik.values.role !== "";
      case 2:
        const basicFieldsValid =
          formik.values.firstName.trim() !== "" &&
          formik.values.lastName.trim() !== "" &&
          formik.values.email.trim() !== "" &&
          formik.values.password.trim() !== "";

        const passwordStrongEnough =
          checkPasswordStrength(formik.values.password) >= 3;
        const emailBlocking =
          emailError && !emailError.includes("Unable to verify");

        if (formik.values.role === "tutor") {
          return (
            basicFieldsValid &&
            passwordStrongEnough &&
            formik.values.qualificationFile !== null &&
            (formik.values.qualificationFile as File).type ===
              "application/pdf" &&
            !emailBlocking
          );
        }
        return basicFieldsValid && passwordStrongEnough && !emailBlocking;
      case 3:
        return formik.values.subjects.length > 0;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      if (currentStep === 2 && formik.values.email.trim()) {
        const isEmailAvailable = await validateEmailAvailability(
          formik.values.email,
        );
        if (!isEmailAvailable) {
          formik.setFieldTouched("email", true);
          return;
        }
      }

      if (!validateCurrentStep()) {
        switch (currentStep) {
          case 1:
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
        return;
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
        )
        .test(
          "email-password",
          "Password cannot be the same as your email address",
          function (value) {
            const { email } = this.parent;
            if (value && email && value.toLowerCase() === email.toLowerCase()) {
              return false;
            }
            return true;
          },
        ),
      role: Yup.string().required("Required"),
      subjects: Yup.array().min(1, "Select at least one subject"),
      qualificationFile: Yup.mixed().when("role", {
        is: "tutor",
        then: (schema) =>
          schema
            .required("Qualification file is required for tutors")
            .test(
              "fileType",
              "Only PDF files are accepted",
              (value) => value && (value as File).type === "application/pdf",
            ),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    onSubmit: async (values) => {
      setError("");
      setIsSubmitting(true);
      try {
        if (values.role === "tutor") {
          const formData = new FormData();
          formData.append("firstName", values.firstName);
          formData.append("lastName", values.lastName);
          formData.append("email", values.email);
          formData.append("password", values.password);
          formData.append("role", values.role);
          values.subjects.forEach((subject) =>
            formData.append("subjects", subject),
          );
          if (values.qualificationFile) {
            formData.append("qualificationFile", values.qualificationFile);
          }

          await submitTutorApplication(formData);
          setRegistrationSuccess(true);
        } else {
          await register(values);
          setRegistrationSuccess(true);
          setCountdown(3);
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                onClose();
                navigate("/login?registered=true");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (err: any) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const resetForm = () => {
    formik.resetForm();
    setCurrentStep(1);
    setError("");
    setIsDragOver(false);
    setRegistrationSuccess(false);
    setIsSubmitting(false);
    setCountdown(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
      if (file.type === "application/pdf") {
        formik.setFieldValue("qualificationFile", file);
      } else {
        formik.setFieldError(
          "qualificationFile",
          "Only PDF files are accepted",
        );
      }
    }
  };

  const getProgressBarWidth = (step: number) => {
    if (currentStep >= step) return "100%";
    if (currentStep === step - 1) return "50%";
    return "0%";
  };

  return (
    <Dialog
      isOpen={show}
      onClose={handleClose}
      width="lg"
      labelledById="new-register-modal"
    >
      <div className="new-register-modal">
        {/* Header */}
        <div className="new-modal-header">
          <h2 className="new-modal-title">Create Your Account</h2>
          <button className="new-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="new-progress-stepper">
          <div className="new-progress-container">
            <div
              className={`new-progress-step ${registrationSuccess ? "completed" : currentStep >= 1 ? (currentStep === 1 ? "active" : "completed") : ""}`}
            >
              {registrationSuccess ? "" : currentStep > 1 ? "" : "1"}
            </div>
            <div className="new-progress-connector">
              <div
                className="new-progress-bar"
                style={{
                  width: registrationSuccess ? "100%" : getProgressBarWidth(2),
                }}
              />
            </div>
            <div
              className={`new-progress-step ${registrationSuccess ? "completed" : currentStep >= 2 ? (currentStep === 2 ? "active" : "completed") : ""}`}
            >
              {registrationSuccess ? "" : currentStep > 2 ? "" : "2"}
            </div>
            <div className="new-progress-connector">
              <div
                className="new-progress-bar"
                style={{
                  width: registrationSuccess ? "100%" : getProgressBarWidth(3),
                }}
              />
            </div>
            <div
              className={`new-progress-step ${registrationSuccess ? "completed" : currentStep >= 3 ? (currentStep === 3 ? "active" : "completed") : ""}`}
            >
              {registrationSuccess ? "" : currentStep > 3 ? "" : "3"}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="new-modal-body">
          <form onSubmit={formik.handleSubmit}>
            <div className="new-step-content">
              {error && (
                <div
                  className="new-error-message"
                  style={{ textAlign: "center", marginBottom: "16px" }}
                >
                  {error}
                </div>
              )}

              {registrationSuccess && (
                <div className="new-success-container">
                  <div className="new-success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  {formik.values.role === "tutor" ? (
                    <>
                      <h3 className="new-success-title">
                        Application Submitted!
                      </h3>
                      <p className="new-success-description">
                        Thank you for applying. Your application is under
                        review.
                      </p>
                      <p className="new-success-redirect">
                        You will be notified of the outcome via email. Please
                        check your spam/junk folder if you don't see it in your
                        inbox. You may now close this window.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="new-success-title">
                        Account Created Successfully!
                      </h3>
                      <p className="new-success-description">
                        Welcome to CampusLearn! Your account has been created
                        successfully.
                      </p>
                      <p className="new-success-redirect">
                        Redirecting you to login in {countdown} second
                        {countdown !== 1 ? "s" : ""}...
                      </p>
                    </>
                  )}
                </div>
              )}

              {!registrationSuccess && currentStep === 1 && (
                <div>
                  <h3 className="new-step-title">
                    Are you a Student or a Tutor?
                  </h3>
                  <p className="new-step-description">
                    Choose your role to get started
                  </p>
                  <div className="new-role-selection">
                    <div
                      className={`new-role-option ${formik.values.role === "student" ? "selected" : ""}`}
                      onClick={() => formik.setFieldValue("role", "student")}
                    >
                      <i className="fas fa-user-graduate new-role-icon"></i>
                      <h3 className="new-role-title">Student</h3>
                      <p className="new-role-description">
                        Learn from peers and tutors
                      </p>
                    </div>
                    <div
                      className={`new-role-option ${formik.values.role === "tutor" ? "selected" : ""}`}
                      onClick={() => formik.setFieldValue("role", "tutor")}
                    >
                      <i className="fas fa-chalkboard-teacher new-role-icon"></i>
                      <h3 className="new-role-title">Tutor</h3>
                      <p className="new-role-description">
                        Share knowledge and earn
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!registrationSuccess && currentStep === 2 && (
                <div>
                  <h3 className="new-step-title">Enter Your Details</h3>
                  <p className="new-step-description">
                    All fields are required to continue
                  </p>

                  <div className="new-form-group">
                    <label className="new-form-label">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      className={`new-form-control ${formik.touched.firstName && formik.errors.firstName ? "is-invalid" : ""}${formik.touched.firstName && !formik.errors.firstName ? "is-valid" : ""}`}
                      placeholder="Enter your first name"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.firstName}
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <div className="new-error-message">
                        {formik.errors.firstName}
                      </div>
                    )}
                  </div>

                  <div className="new-form-group">
                    <label className="new-form-label">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className={`new-form-control ${formik.touched.lastName && formik.errors.lastName ? "is-invalid" : ""}${formik.touched.lastName && !formik.errors.lastName ? "is-valid" : ""}`}
                      placeholder="Enter your last name"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.lastName}
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <div className="new-error-message">
                        {formik.errors.lastName}
                      </div>
                    )}
                  </div>

                  <div className="new-form-group">
                    <label className="new-form-label">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`new-form-control ${
                        (formik.touched.email && formik.errors.email) ||
                        emailError
                          ? "is-invalid"
                          : ""
                      }${
                        formik.touched.email &&
                        !formik.errors.email &&
                        !emailError &&
                        emailSuccess
                          ? "is-valid"
                          : ""
                      }`}
                      placeholder="Enter your email"
                      onChange={(e) => {
                        formik.handleChange(e);
                        if (emailError) setEmailError(null);
                        if (emailSuccess) setEmailSuccess(false);
                        debouncedEmailCheck(e.target.value);
                      }}
                      onBlur={formik.handleBlur}
                      value={formik.values.email}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <div className="new-error-message">
                        {formik.errors.email}
                      </div>
                    )}
                    {emailError && (
                      <div className="new-error-message">{emailError}</div>
                    )}
                    {isCheckingEmail && (
                      <div className="new-loading-message">
                        <i className="fas fa-spinner fa-spin"></i> Checking
                        email availability...
                      </div>
                    )}
                    {emailSuccess && !isCheckingEmail && (
                      <div className="new-success-message">
                        <i className="fas fa-check"></i> Email is available
                      </div>
                    )}
                  </div>

                  <div className="new-form-group">
                    <label className="new-form-label">Password</label>
                    <div className="new-password-wrapper">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`new-form-control new-password-input ${formik.touched.password && formik.errors.password ? "is-invalid" : ""}${formik.touched.password && !formik.errors.password ? "is-valid" : ""}`}
                        placeholder="Create a password"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.password}
                      />
                      <button
                        type="button"
                        className="new-password-toggle"
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
                    <div className="new-password-strength">
                      <div
                        className="new-strength-bar"
                        data-strength={checkPasswordStrength(
                          formik.values.password,
                        )}
                      ></div>
                    </div>
                    {formik.values.password && (
                      <div
                        className="new-strength-text"
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
                    {formik.touched.password && formik.errors.password && (
                      <div className="new-error-message">
                        {formik.errors.password}
                      </div>
                    )}
                  </div>

                  {formik.values.role === "tutor" && (
                    <div className="new-form-group">
                      <label className="new-form-label">
                        Qualification Document
                      </label>
                      <div className="new-file-upload-container">
                        <input
                          id="qualificationFile"
                          name="qualificationFile"
                          type="file"
                          className="new-file-input"
                          accept=".pdf"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0] || null;
                            if (file && file.type === "application/pdf") {
                              formik.setFieldValue("qualificationFile", file);
                            } else if (file) {
                              formik.setFieldError(
                                "qualificationFile",
                                "Only PDF files are accepted",
                              );
                            } else {
                              formik.setFieldValue("qualificationFile", null);
                            }
                          }}
                          onBlur={formik.handleBlur}
                        />
                        <label
                          htmlFor="qualificationFile"
                          className={`new-file-upload ${isDragOver ? "drag-over" : ""}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <i className="fas fa-cloud-upload-alt new-file-icon"></i>
                          <div className="new-file-text">
                            {formik.values.qualificationFile
                              ? (formik.values.qualificationFile as File).name
                              : "Choose file or drag and drop"}
                          </div>
                          <div className="new-file-subtext">PDF (Max 10MB)</div>
                        </label>
                      </div>
                      {formik.touched.qualificationFile &&
                        formik.errors.qualificationFile && (
                          <div className="new-error-message">
                            {formik.errors.qualificationFile}
                          </div>
                        )}
                      {formik.values.qualificationFile && (
                        <div className="new-file-preview">
                          <i className="fas fa-file-pdf"></i>
                          <span>
                            {(formik.values.qualificationFile as File).name}
                          </span>
                          <button
                            type="button"
                            className="new-file-remove"
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
                  <h3 className="new-step-title">Select Your Subjects</h3>
                  <p className="new-step-description">
                    Please select at least one subject to continue
                  </p>
                  <div className="new-subjects-container">
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
                          className="new-subject-checkbox"
                          name="subjects"
                          value={subject}
                          checked={(
                            formik.values.subjects as string[]
                          ).includes(subject)}
                          onChange={formik.handleChange}
                        />
                        <label htmlFor={subject} className="new-subject-label">
                          <i
                            className={`fas new-subject-icon ${
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
                          <span className="new-subject-text">{subject}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {formik.touched.subjects && formik.errors.subjects && (
                    <div
                      className="new-error-message"
                      style={{ textAlign: "center", marginTop: "16px" }}
                    >
                      {formik.errors.subjects}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Actions */}
        {!registrationSuccess && (
          <div className="new-modal-actions">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  className="new-btn new-btn-secondary"
                  onClick={handleBack}
                >
                  <i className="fas fa-arrow-left"></i>
                  Back
                </button>
              )}
            </div>
            <div>
              {currentStep < steps.length ? (
                <button
                  type="button"
                  className={`new-btn new-btn-primary ${!validateCurrentStep() ? "new-btn-disabled" : ""}`}
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                >
                  Next
                  <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  className={`new-btn new-btn-primary ${isSubmitting ? "new-btn-loading" : ""}`}
                  onClick={() => formik.handleSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Finish
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default NewRegisterStepperModal;
