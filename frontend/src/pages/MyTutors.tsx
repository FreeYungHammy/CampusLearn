import React, { useState } from "react";

const MyTutors = () => {
  const [tutors, setTutors] = useState([
    { id: "gideon", name: "Dr. Gideon Mbeki", subscribed: true },
    { id: "sarah", name: "Prof. Sarah Chen", subscribed: true },
  ]);

  const toggleSubscription = (id) => {
    setTutors(
      tutors.map((tutor) =>
        tutor.id === id ? { ...tutor, subscribed: !tutor.subscribed } : tutor,
      ),
    );
  };

  return (
    <div className="content-view" id="mytutors-view">
      <h2 className="section-title">
        <i className="fas fa-user-friends"></i>My Tutors
      </h2>
      <div className="tutor-grid">
        <div className="tutor-card">
          <div className="tutor-header">
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Tutor"
              className="tutor-avatar"
            />
            <div className="tutor-info">
              <h3>Dr. Gideon Mbeki</h3>
              <p>Mathematics Professor</p>
              <div className="rating">
                <i className="fas fa-star"></i> 4.8
              </div>
            </div>
          </div>
          <div className="tutor-stats">
            <div className="stat">
              <div className="stat-value">5</div>
              <div className="stat-label">Subjects</div>
            </div>
            <div className="stat">
              <div className="stat-value">142</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          <div className="tutor-subjects">
            <span>MAT281</span>
            <span>PRG281</span>
            <span>MAT261</span>
            <span>MAT201</span>
          </div>
          <a href="#" className="view-profile" data-tutor="gideon">
            View Profile & Content
          </a>
          <button
            className={`btn btn-sm ${tutors.find((t) => t.id === "gideon").subscribed ? "btn-danger" : "btn-success"}`}
            onClick={() => toggleSubscription("gideon")}
          >
            <i
              className={`fas ${tutors.find((t) => t.id === "gideon").subscribed ? "fa-times" : "fa-plus"}`}
            ></i>
            {tutors.find((t) => t.id === "gideon").subscribed
              ? "Unsubscribe"
              : "Subscribe"}
          </button>
        </div>
        <div className="tutor-card">
          <div className="tutor-header">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Tutor"
              className="tutor-avatar"
            />
            <div className="tutor-info">
              <h3>Prof. Sarah Chen</h3>
              <p>Calculus Specialist</p>
              <div className="rating">
                <i className="fas fa-star"></i> 4.9
              </div>
            </div>
          </div>
          <div className="tutor-stats">
            <div className="stat">
              <div className="stat-value">3</div>
              <div className="stat-label">Subjects</div>
            </div>
            <div className="stat">
              <div className="stat-value">98</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          <div className="tutor-subjects">
            <span>MAT281</span>
            <span>MAT201</span>
            <span>MAT101</span>
          </div>
          <a href="#" className="view-profile" data-tutor="sarah">
            View Profile & Content
          </a>
          <button
            className={`btn btn-sm ${tutors.find((t) => t.id === "sarah").subscribed ? "btn-danger" : "btn-success"}`}
            onClick={() => toggleSubscription("sarah")}
          >
            <i
              className={`fas ${tutors.find((t) => t.id === "sarah").subscribed ? "fa-times" : "fa-plus"}`}
            ></i>
            {tutors.find((t) => t.id === "sarah").subscribed
              ? "Unsubscribe"
              : "Subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyTutors;
