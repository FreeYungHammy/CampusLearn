import React, { useState } from "react";

const MyTutors = () => {
  const [tutors, setTutors] = useState([
    {
      id: "gideon",
      name: "Dr. Gideon Mbeki",
      title: "Mathematics Professor",
      rating: 4.8,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      subjects: 5,
      students: 142,
      subjectTags: ["MAT281", "PRG281", "MAT261", "MAT201", "MAT151"],
      subscribed: true,
    },
    {
      id: "sarah",
      name: "Prof. Sarah Chen",
      title: "Calculus Specialist",
      rating: 4.9,
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      subjects: 3,
      students: 98,
      subjectTags: ["MAT281", "MAT201", "MAT101"],
      subscribed: true,
    },
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
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-user-friends"></i>My Tutors
        </h2>
      </div>

      <div className="tutor-grid">
        {tutors.map((tutor) => (
          <div key={tutor.id} className="tutor-card">
            <div className="tutor-header">
              <img
                src={tutor.avatar}
                alt={tutor.name}
                className="tutor-avatar"
              />
              <div className="tutor-info">
                <h3>{tutor.name}</h3>
                <p>{tutor.title}</p>
                <div className="rating">
                  <i className="fas fa-star"></i> {tutor.rating}
                </div>
              </div>
            </div>

            <div className="tutor-stats">
              <div className="stat">
                <div className="stat-value">{tutor.subjects}</div>
                <div className="stat-label">SUBJECTS</div>
              </div>
              <div className="stat">
                <div className="stat-value">{tutor.students}</div>
                <div className="stat-label">STUDENTS</div>
              </div>
            </div>

            <div className="tutor-subjects">
              {tutor.subjectTags.map((subject, index) => (
                <span key={index} className="subject-tag">
                  {subject}
                </span>
              ))}
            </div>

            <div className="tutor-actions">
              <a href="#" className="view-profile-btn">
                View Profile & Content
              </a>
              <button
                className={`unsubscribe-btn ${tutor.subscribed ? "subscribed" : ""}`}
                onClick={() => toggleSubscription(tutor.id)}
              >
                <i
                  className={`fas ${tutor.subscribed ? "fa-user-minus" : "fa-user-plus"}`}
                ></i>
                {tutor.subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyTutors;
