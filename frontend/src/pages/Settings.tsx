import React, { useState } from "react";

const Settings = () => {
  const [pfp, setPfp] = useState(
    "https://randomuser.me/api/portraits/men/67.jpg",
  );

  const handlePfpChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPfp(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="content-view" id="settings-view">
      <h2 className="section-title">
        <i className="fas fa-cog"></i>Settings
      </h2>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-user-cog"></i>Account Settings
          </div>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i>Full Name
            </label>
            <input
              type="text"
              className="form-control"
              defaultValue="John Doe"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-envelope"></i>Email Address
            </label>
            <input
              type="email"
              className="form-control"
              defaultValue="john.doe@belgiumcampus.ac.za"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-id-card"></i>Student ID
            </label>
            <input
              type="text"
              className="form-control"
              defaultValue="BC123456"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-graduation-cap"></i>Program
            </label>
            <select className="form-control">
              <option>BCom</option>
              <option>BIT</option>
              <option>Diploma</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-camera"></i>Profile Picture
            </label>
            <input
              type="file"
              id="pfp-upload"
              style={{ display: "none" }}
              accept="image/*"
              onChange={handlePfpChange}
            />
            <button
              className="btn btn-outline"
              onClick={() => document.getElementById("pfp-upload").click()}
            >
              Upload Image
            </button>
            <img
              src={pfp}
              alt="Avatar"
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                marginTop: "10px",
              }}
            />
          </div>
          <button className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
