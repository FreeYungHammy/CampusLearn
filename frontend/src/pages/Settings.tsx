import React, { useState, useEffect } from "react";
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
  updateEnrolledCourses,
  deleteAccount,
  getEmailPreferences,
  updateEmailPreferences,
} from "../services/settingsApi";
import PageHeader from "../components/PageHeader";

const Settings = () => {
  const [notifications, setNotifications] = useState({
    newMessages: true,
    forumReplies: true,
    tutorUpdates: false,
  });

  const [emailPreferences, setEmailPreferences] = useState({
    bookingConfirmations: true,
    generalNotifications: true,
    marketingEmails: false,
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Subject management state
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [subjectsToEnroll, setSubjectsToEnroll] = useState<string[]>([]);
  const [availableSubjects] = useState([
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
  ]);
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [subjectsSaveMessage, setSubjectsSaveMessage] = useState<string | null>(
    null,
  );

  const { user, token, setUser, pfpTimestamps, refreshPfpForUser } =
    useAuthStore((state) => ({
      user: state.user,
      token: state.token,
      setUser: state.setUser,
      pfpTimestamps: state.pfpTimestamps,
      refreshPfpForUser: state.refreshPfpForUser,
    }));

  // Initialize enrolled subjects from user data
  useEffect(() => {
    if (user && (user as any).enrolledCourses) {
      setEnrolledSubjects((user as any).enrolledCourses || []);
    }
  }, [user]);

  // Load email preferences
  useEffect(() => {
    const loadEmailPreferences = async () => {
      if (!token) return;
      
      try {
        const response = await getEmailPreferences(token);
        setEmailPreferences(response.preferences);
      } catch (error) {
        console.error("Failed to load email preferences:", error);
      }
    };

    loadEmailPreferences();
  }, [token]);

  const handleConfirmDeleteAccount = async (password: string) => {
    if (!token) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount(token, password);
      // Clear auth state and redirect to login
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = "/login";
    } catch (error: any) {
      console.error("Failed to delete account", error);
      // The error will be handled by the modal - you might want to show a toast or alert here
      alert(
        error.response?.data?.message ||
          "Failed to delete account. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

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
      email: user?.email || "",
    },
    validationSchema: Yup.object({
      current: Yup.string().required("Required"),
      new: Yup.string()
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
      confirm: Yup.string()
        .oneOf([Yup.ref("new")], "Passwords must match")
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

  const handleEmailPreferenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token) return;

    const newPreferences = { ...emailPreferences, [e.target.name]: e.target.checked };
    setEmailPreferences(newPreferences);

    try {
      await updateEmailPreferences(token, { [e.target.name]: e.target.checked });
    } catch (error) {
      console.error("Failed to update email preferences:", error);
      // Revert the change on error
      setEmailPreferences(emailPreferences);
    }
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

  // Subject management functions
  const handleRemoveEnrolledSubject = (subject: string) => {
    setEnrolledSubjects((prev) => prev.filter((s) => s !== subject));
    setSubjectsSaveMessage(null);
    // Note: Changes will be persisted when user clicks "Save Changes"
  };

  const handleAddToEnrollList = (subject: string) => {
    if (
      !subjectsToEnroll.includes(subject) &&
      !enrolledSubjects.includes(subject)
    ) {
      setSubjectsToEnroll((prev) => [...prev, subject]);
      setSubjectsSaveMessage(null);
    }
  };

  const handleRemoveFromEnrollList = (subject: string) => {
    setSubjectsToEnroll((prev) => prev.filter((s) => s !== subject));
    setSubjectsSaveMessage(null);
  };

  const handleSaveSubjects = async () => {
    if (!token || !user) return;

    setIsSavingSubjects(true);
    setSubjectsSaveMessage(null);

    try {
      // Calculate the final enrolled courses array
      const finalEnrolledCourses = [...enrolledSubjects, ...subjectsToEnroll];

      console.log("💾 Saving subjects:", {
        enrolledSubjects,
        subjectsToEnroll,
        finalEnrolledCourses,
      });

      // Call the API to update enrolled courses in the database
      const response = await updateEnrolledCourses(token, finalEnrolledCourses);

      console.log("✅ API Response:", response);

      // Update the user's enrolled courses in the auth store
      const updatedUser = {
        ...user,
        enrolledCourses: response.enrolledCourses,
      };
      setUser(updatedUser);

      // Move subjects from "to enroll" to "enrolled"
      setEnrolledSubjects(finalEnrolledCourses);
      setSubjectsToEnroll([]);

      setSubjectsSaveMessage("Subjects updated successfully!");

      // Clear message after 3 seconds
      setTimeout(() => {
        setSubjectsSaveMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to update enrolled courses:", error);
      setSubjectsSaveMessage("Failed to update subjects. Please try again.");
    } finally {
      setIsSavingSubjects(false);
    }
  };

  const handleConfirmSavePfp = async () => {
    if (!profilePicture || !token || !user) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await updateProfilePicture(token, profilePicture);
      // The websocket event will trigger the timestamp update
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
    if (passwordStrength <= 4) {
      return <span style={{ color: "var(--secondary)" }}>Strong</span>;
    }
    return <span style={{ color: "var(--secondary)" }}>Very Strong</span>;
  };

  const getSubjectIcon = (subject: string) => {
    const iconMap: { [key: string]: string } = {
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
    };
    return iconMap[subject] || "fa-book";
  };

  const pfpUrl = user
    ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api/users/${user.id}/pfp?t=${pfpTimestamps[user.id] || 0}`
    : "";

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
      <DeleteAccountConfirmationModal
        show={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleConfirmDeleteAccount}
        isSubmitting={isDeletingAccount}
      />
      <div className="settings-container">
        <PageHeader
          title="Settings"
          subtitle="Manage your account preferences and profile"
          icon="fas fa-cog"
        />

        {/* Profile Information Card */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
          </div>
          <div className="profile-picture-section">
            <img
              src={preview || pfpUrl || "https://via.placeholder.com/150"}
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

        {user?.role !== "admin" && (
          <div className="settings-card">
            <div className="card-header">
              <h2 className="card-title">My Subjects</h2>
              <p className="card-subtitle">
                Manage your enrolled subjects and select new ones to enroll in
              </p>
            </div>

            {/* Currently Enrolled Subjects */}
            <div className="subjects-section">
              <h3 className="subjects-section-title">
                <i className="fas fa-graduation-cap"></i>
                Currently Enrolled ({enrolledSubjects.length})
              </h3>
              {enrolledSubjects.length > 0 ? (
                <div className="subjects-grid">
                  {enrolledSubjects.map((subject) => (
                    <div key={subject} className="subject-chip enrolled">
                      <i className={`fas ${getSubjectIcon(subject)}`}></i>
                      <span>{subject}</span>
                      <button
                        className="remove-subject-btn"
                        onClick={() => handleRemoveEnrolledSubject(subject)}
                        title="Remove from enrolled subjects"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-subjects">
                  <i className="fas fa-book-open"></i>
                  <p>
                    No subjects enrolled yet. Select subjects below to enroll.
                  </p>
                </div>
              )}
            </div>

            {/* Subjects to Enroll In */}
            <div className="subjects-section">
              <h3 className="subjects-section-title">
                <i className="fas fa-plus-circle"></i>
                Subjects to Enroll In ({subjectsToEnroll.length})
              </h3>
              {subjectsToEnroll.length > 0 ? (
                <div className="subjects-grid">
                  {subjectsToEnroll.map((subject) => (
                    <div key={subject} className="subject-chip to-enroll">
                      <i className={`fas ${getSubjectIcon(subject)}`}></i>
                      <span>{subject}</span>
                      <button
                        className="remove-subject-btn"
                        onClick={() => handleRemoveFromEnrollList(subject)}
                        title="Remove from enrollment list"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-subjects">
                  <i className="fas fa-plus"></i>
                  <p>
                    No subjects selected for enrollment. Choose from available
                    subjects below.
                  </p>
                </div>
              )}
            </div>

            {/* Available Subjects */}
            <div className="subjects-section">
              <h3 className="subjects-section-title">
                <i className="fas fa-list"></i>
                Available Subjects
              </h3>
              <div className="subjects-grid">
                {availableSubjects
                  .filter(
                    (subject) =>
                      !enrolledSubjects.includes(subject) &&
                      !subjectsToEnroll.includes(subject),
                  )
                  .map((subject) => (
                    <div key={subject} className="subject-chip available">
                      <i className={`fas ${getSubjectIcon(subject)}`}></i>
                      <span>{subject}</span>
                      <button
                        className="add-subject-btn"
                        onClick={() => handleAddToEnrollList(subject)}
                        title="Add to enrollment list"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Save Button and Messages */}
            <div className="card-footer">
              <button
                onClick={handleSaveSubjects}
                className="btn btn-primary"
                disabled={isSavingSubjects}
              >
                {isSavingSubjects ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save Changes
                  </>
                )}
              </button>
              {subjectsSaveMessage && (
                <div
                  className={`subjects-message ${subjectsSaveMessage.includes("success") ? "success" : "error"}`}
                >
                  <i
                    className={`fas ${subjectsSaveMessage.includes("success") ? "fa-check-circle" : "fa-exclamation-circle"}`}
                  ></i>
                  {subjectsSaveMessage}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Email Preferences Section */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Email Preferences</h2>
            <p className="card-description">
              Choose which emails you'd like to receive from CampusLearn.
            </p>
            <div style={{backgroundColor: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px', marginTop: '10px'}}>
              <p style={{color: '#1e40af', margin: '0', fontSize: '14px'}}>
                <strong>Note:</strong> Security emails (like suspicious login alerts) are always sent to protect your account.
              </p>
            </div>
          </div>
          <div className="card-body">
            <div className="notification-group">
              <div>
                <div className="notification-label">Booking Confirmations</div>
                <p>Receive booking confirmations and session reminder emails.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="bookingConfirmations"
                  checked={emailPreferences.bookingConfirmations}
                  onChange={handleEmailPreferenceChange}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="notification-group">
              <div>
                <div className="notification-label">General Notifications</div>
                <p>Receive forum reply notifications and important platform updates.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="generalNotifications"
                  checked={emailPreferences.generalNotifications}
                  onChange={handleEmailPreferenceChange}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="notification-group">
              <div>
                <div className="notification-label">Marketing Emails</div>
                <p>Receive promotional content and platform updates.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="marketingEmails"
                  checked={emailPreferences.marketingEmails}
                  onChange={handleEmailPreferenceChange}
                />
                <span className="slider"></span>
              </label>
            </div>
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
