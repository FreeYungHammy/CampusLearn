import React, { useState } from "react";
import "./Settings.css";

const Settings = () => {
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  const [notifications, setNotifications] = useState({
    newMessages: true,
    forumReplies: true,
    tutorUpdates: false,
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassword({ ...password, [name]: value });

    if (name === "new") {
      setPasswordStrength(checkPasswordStrength(value));
    }
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

  return (
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
            src={preview || "https://via.placeholder.com/150"}
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
        </div>
        <form>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                name="firstName"
                className="form-control"
                value={profile.firstName}
                onChange={handleProfileChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                name="lastName"
                className="form-control"
                value={profile.lastName}
                onChange={handleProfileChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={profile.email}
              onChange={handleProfileChange}
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
        <form>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              name="current"
              className="form-control"
              value={password.current}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                name="new"
                className="form-control"
                value={password.new}
                onChange={handlePasswordChange}
              />
            </div>
            <div className="password-strength-meter">
              <div
                className="strength-bar"
                data-strength={passwordStrength}
              ></div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                name="confirm"
                className="form-control"
                value={password.confirm}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
          </div>
        </form>
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
    </div>
  );
};

export default Settings;
