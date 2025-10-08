import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { register } from "../services/authApi";
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

const RegisterStepperModal: React.FC<RegisterStepperModalProps> = ({
  show,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "prev"
  >("next");
  const steps = ["Role", "Details", "Subjects"];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length) {
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
        .test("password-strength", "Password is too weak", (value) => {
          return checkPasswordStrength(value || "") >= 4;
        }),
      role: Yup.string().required("Required"),
      subjects: Yup.array().min(1, "Select at least one subject"),
      qualificationFile: Yup.mixed() // Add this validation
        .when("role", {
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
        onClose();
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

  return (
    <Dialog isOpen={show} onClose={onClose} width="lg">
      <div className="register-stepper-modal">
        <div className="modal-header">
          <h2 className="modal-title">Create Your Account</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className="modal-body">
            <Stepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
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
              {currentStep === 1 && (
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
              {currentStep === 2 && (
                <div>
                  <h3 className="step-title">Enter Your Details</h3>
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
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.email}
                    />
                    {formik.touched.email && formik.errors.email ? (
                      <div className="error-message">{formik.errors.email}</div>
                    ) : null}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="password-wrapper">
                      <input
                        id="password"
                        name="password"
                        type="password"
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
                    </div>
                    <div className="password-strength-meter">
                      <div
                        className="strength-bar"
                        data-strength={checkPasswordStrength(
                          formik.values.password,
                        )}
                      ></div>
                    </div>
                  </div>

                  {/* File Upload Section - Only show for tutors */}
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
              {currentStep === 3 && (
                <div>
                  <h3 className="step-title">Select Your Subjects</h3>
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
                  {formik.touched.subjects && formik.errors.subjects ? (
                    <div className="error-message">
                      {formik.errors.subjects}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
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
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">
                Finish
              </button>
            )}
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default RegisterStepperModal;
