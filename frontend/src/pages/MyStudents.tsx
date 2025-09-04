import React from "react";

const MyStudents = () => {
  return (
    <div className="content-view" id="mystudents-view">
      <h2 className="section-title">
        <i className="fas fa-users"></i>My Students
      </h2>
      <div className="students-grid">
        <div className="student-card">
          <div className="student-header">
            <div className="student-avatar">JD</div>
            <div className="student-name">John Doe</div>
            <div className="student-course">BIT Student</div>
          </div>
          <div className="student-details">
            <div className="student-stats">
              <div className="stat">
                <div className="stat-value">12</div>
                <div className="stat-label">Sessions</div>
              </div>
            </div>
            <button className="btn btn-outline">View Progress</button>
          </div>
        </div>
        <div className="student-card">
          <div className="student-header">
            <div className="student-avatar">EM</div>
            <div className="student-name">Emma Miller</div>
            <div className="student-course">BCom Student</div>
          </div>
          <div className="student-details">
            <div className="student-stats">
              <div className="stat">
                <div className="stat-value">8</div>
                <div className="stat-label">Sessions</div>
              </div>
            </div>
            <button className="btn btn-outline">View Progress</button>
          </div>
        </div>
        <div className="student-card">
          <div className="student-header">
            <div className="student-avatar">AR</div>
            <div className="student-name">Alex Rivera</div>
            <div className="student-course">Diploma IT</div>
          </div>
          <div className="student-details">
            <div className="student-stats">
              <div className="stat">
                <div className="stat-value">5</div>
                <div className="stat-label">Sessions</div>
              </div>
            </div>
            <button className="btn btn-outline">View Progress</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyStudents;
