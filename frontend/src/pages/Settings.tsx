import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuthStore } from "../store/authStore";
import "./Settings.css";
import SaveProfileConfirmationModal from "../components/SaveProfileConfirmationModal";
import UpdatePasswordConfirmationModal from "../components/UpdatePasswordConfirmationModal";
import SavePictureConfirmationModal from "../components/SavePictureConfirmationModal";
import DeleteAccountConfirmationModal from "../components/DeleteAccountConfirmationModal";
import {
  updatePassword,
  updateProfile,
  updateProfilePicture,
} from "../services/settingsApi";

const Settings = () => {
  const [notifications, setNotifications] = useState({
    newMessages: true,
    forumReplies: true,
    tutorUpdates: false,
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const { user, token, setUser } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
    setUser: state.setUser,
  }));

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.name || "",
      lastName: user?.surname || "",
      email: user?.email || "",
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
    }),
    onSubmit: async (values) => {
      setShowProfileModal(true);
    },
  });

  const handleConfirmSaveProfile = async () => {
    if (!token) return;

    try {
      await updateProfile(
        token,
        profileFormik.values.firstName,
        profileFormik.values.lastName,
      );
      const updatedUser = {
        ...user!,
        name: profileFormik.values.firstName,
        surname: profileFormik.values.lastName,
      };
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
    setShowProfileModal(false);
  };

  const passwordFormik = useFormik({
    initialValues: {
      current: "",
      new: "",
      confirm: "",
    },
    validationSchema: Yup.object({
      current: Yup.string().required("Required"),
      new: Yup.string()
        .required("Required")
        .test("password-strength", "Password is too weak", (value) => {
          return checkPasswordStrength(value || "") >= 4;
        }),
      confirm: Yup.string()
        .oneOf([Yup.ref("new"), null], "Passwords must match")
        .required("Required"),
    }),
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setShowPasswordModal(true);
    },
  });

  const handleConfirmUpdatePassword = async () => {
    if (!token) return;

    try {
      await updatePassword(
        token,
        passwordFormik.values.current,
        passwordFormik.values.new,
      );
      passwordFormik.setStatus({ success: "Password updated successfully" });
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        passwordFormik.setStatus({ error: "Invalid current password" });
      } else {
        passwordFormik.setStatus({
          error: "Failed to update password. Please try again.",
        });
      }
    }
    passwordFormik.setSubmitting(false);
    setShowPasswordModal(false);
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications({ ...notifications, [e.target.name]: e.target.checked });
  };

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSavePfp = async () => {
    setShowPictureModal(true);
  };

  const handleConfirmSavePfp = async () => {
    if (!profilePicture || !token) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const base64String = await updateProfilePicture(token, profilePicture);
      const base64Data = base64String.split(",")[1];
      const updatedUser = {
        ...user!,
        pfp: { data: base64Data, contentType: profilePicture.type },
      };
      setUser(updatedUser);
      setPreview(null);
    } catch (error) {
      setUploadError("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
      setShowPictureModal(false);
    }
  };

  const passwordStrength = checkPasswordStrength(passwordFormik.values.new);

  const getStrengthText = () => {
    if (passwordFormik.values.new.length === 0) {
      return null;
    }
    if (passwordStrength <= 1) {
      return <span style={{ color: "var(--danger)" }}>Weak</span>;
    }
    if (passwordStrength <= 3) {
      return <span style={{ color: "var(--warning)" }}>Moderate</span>;
    }
    return <span style={{ color: "var(--secondary)" }}>Strong</span>;
  };

  return (
    <>
      <SaveProfileConfirmationModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onConfirm={handleConfirmSaveProfile}
        isSubmitting={profileFormik.isSubmitting}
      />
      <UpdatePasswordConfirmationModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleConfirmUpdatePassword}
        isSubmitting={passwordFormik.isSubmitting}
      />
      <SavePictureConfirmationModal
        show={showPictureModal}
        onClose={() => setShowPictureModal(false)}
        onConfirm={handleConfirmSavePfp}
        isSubmitting={isUploading}
      />
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Account Settings</h1>
        </div>

        {/* Profile Information Card */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
          </div>
          <div className="profile-picture-section">
            <img
              src={
                preview ||
                (user?.pfp?.data
                  ? `data:${user.pfp.contentType};base64,${user.pfp.data}`
                  : "https://via.placeholder.com/150")
              }
              alt="Profile"
              className="profile-avatar"
            />
            <input
              type="file"
              id="profilePictureInput"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: "none" }}
            />
            <label htmlFor="profilePictureInput" className="btn btn-secondary">
              Change Picture
            </label>
            {preview && (
              <button
                onClick={handleSavePfp}
                className="btn btn-primary"
                disabled={isUploading}
              >
                {isUploading ? "Saving..." : "Save Picture"}
              </button>
            )}
            {uploadError && <p className="text-danger">{uploadError}</p>}
          </div>
          <form onSubmit={profileFormik.handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={`form-control ${
                    profileFormik.touched.firstName &&
                    profileFormik.errors.firstName
                      ? "is-invalid"
                      : ""
                  }${
                    profileFormik.touched.firstName &&
                    !profileFormik.errors.firstName
                      ? "is-valid"
                      : ""
                  }`}
                  onChange={profileFormik.handleChange}
                  value={profileFormik.values.firstName}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={`form-control ${
                    profileFormik.touched.lastName &&
                    profileFormik.errors.lastName
                      ? "is-invalid"
                      : ""
                  }${
                    profileFormik.touched.lastName &&
                    !profileFormik.errors.lastName
                      ? "is-valid"
                      : ""
                  }`}
                  onChange={profileFormik.handleChange}
                  value={profileFormik.values.lastName}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-control ${
                  profileFormik.touched.email && profileFormik.errors.email
                    ? "is-invalid"
                    : ""
                }${
                  profileFormik.touched.email && !profileFormik.errors.email
                    ? "is-valid"
                    : ""
                }`}
                onChange={profileFormik.handleChange}
                value={profileFormik.values.email}
              />
            </div>
            <div className="card-footer">
              <button type="submit" className="btn btn-primary">
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Change Password</h2>
          </div>
          <form onSubmit={passwordFormik.handleSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                id="current"
                name="current"
                type="password"
                className="form-control"
                onChange={passwordFormik.handleChange}
                value={passwordFormik.values.current}
              />
            </div>
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">New Password</label>
                <input
                  id="new"
                  name="new"
                  type="password"
                  className={`form-control ${
                    passwordFormik.touched.new && passwordFormik.errors.new
                      ? "is-invalid"
                      : ""
                  }${
                    passwordFormik.touched.new && !passwordFormik.errors.new
                      ? "is-valid"
                      : ""
                  }`}
                  onChange={passwordFormik.handleChange}
                  value={passwordFormik.values.new}
                />
                <div className="password-strength-meter">
                  <div
                    className="strength-bar"
                    data-strength={passwordStrength}
                  ></div>
                </div>
                <div className="password-strength-text">
                  {getStrengthText()}
                </div>
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Confirm New Password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  className={`form-control ${
                    passwordFormik.touched.confirm &&
                    passwordFormik.errors.confirm
                      ? "is-invalid"
                      : ""
                  }${
                    passwordFormik.touched.confirm &&
                    !passwordFormik.errors.confirm
                      ? "is-valid"
                      : ""
                  }`}
                  onChange={passwordFormik.handleChange}
                  value={passwordFormik.values.confirm}
                />
              </div>
            </div>
            <div className="card-footer">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordFormik.isSubmitting}
              >
                {passwordFormik.isSubmitting
                  ? "Updating..."
                  : "Update Password"}
              </button>
            </div>
            {passwordFormik.status && passwordFormik.status.success && (
              <p className="text-success">{passwordFormik.status.success}</p>
            )}
            {passwordFormik.status && passwordFormik.status.error && (
              <p className="text-danger">{passwordFormik.status.error}</p>
            )}
          </form>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">My Subjects</h2>
          </div>
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
                  {subject}
                </label>
              </div>
            ))}
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-primary">
              Save Subjects
            </button>
          </div>
        </div>

        {/* Notification Settings Card */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Notifications</h2>
          </div>
          <div className="notification-group">
            <div>
              <div className="notification-label">New Messages</div>
              <p className="text-sm text-gray-500">
                Notify me when I receive a new message.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="newMessages"
                checked={notifications.newMessages}
                onChange={handleNotificationChange}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="notification-group">
            <div>
              <div className="notification-label">Forum Replies</div>
              <p>Notify me when someone replies to my forum posts.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="forumReplies"
                checked={notifications.forumReplies}
                onChange={handleNotificationChange}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="notification-group">
            <div>
              <div className="notification-label">Tutor Updates</div>
              <p>Notify me about updates from my tutors.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="tutorUpdates"
                checked={notifications.tutorUpdates}
                onChange={handleNotificationChange}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Delete Account</h2>
          </div>
          <div className="card-body">
            <p className="delete-warning">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteAccountModal(true)}
            >
              Delete Your Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
