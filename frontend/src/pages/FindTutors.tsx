import React, { useState } from "react";

const FindTutors = () => {
  const [subscribedTutors, setSubscribedTutors] = useState([]);

  const toggleSubscription = (tutorId) => {
    if (subscribedTutors.includes(tutorId)) {
      setSubscribedTutors(subscribedTutors.filter((id) => id !== tutorId));
    } else {
      setSubscribedTutors([...subscribedTutors, tutorId]);
    }
  };

  const tutors = [
    {
      id: 1,
      name: "Dr. Gideon Mbeki",
      title: "Mathematics Professor",
      rating: 4.8,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      subjects: 5,
      students: 142,
      subjectTags: ["MAT281", "PRG281", "MAT261", "MAT201", "MAT151"],
      isSubscribed: false,
    },
    {
      id: 2,
      name: "Prof. Sarah Chen",
      title: "Calculus Specialist",
      rating: 4.9,
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      subjects: 3,
      students: 98,
      subjectTags: ["MAT281", "MAT201", "MAT101"],
      isSubscribed: false,
    },
    {
      id: 3,
      name: "Dr. James Okafor",
      title: "Algebra Expert",
      rating: 4.7,
      avatar: "https://randomuser.me/api/portraits/men/22.jpg",
      subjects: 4,
      students: 117,
      subjectTags: ["MAT261", "MAT201", "PRG281", "MAT101"],
      isSubscribed: true,
    },
  ];

  return (
    <div className="content-view" id="tutors-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-user-graduate"></i>Find Tutors
        </h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for tutors..."
            className="form-control"
          />
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="subject-filter">Filter by Subject</label>
          <select id="subject-filter" className="form-control">
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Business">Business</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="rating-filter">Minimum Rating</label>
          <select id="rating-filter" className="form-control">
            <option value="0">Any Rating</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
        </div>
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
                <div className="stat-label">Subjects</div>
              </div>
              <div className="stat">
                <div className="stat-value">{tutor.students}</div>
                <div className="stat-label">Students</div>
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
                className={`btn btn-sm ${subscribedTutors.includes(tutor.id) ? "btn-danger" : "btn-success"}`}
                onClick={() => toggleSubscription(tutor.id)}
              >
                <i
                  className={`fas ${subscribedTutors.includes(tutor.id) ? "fa-times" : "fa-plus"}`}
                ></i>
                {subscribedTutors.includes(tutor.id)
                  ? "Unsubscribe"
                  : "Subscribe"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FindTutors;
