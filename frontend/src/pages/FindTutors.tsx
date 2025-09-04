import React from "react";

const FindTutors = () => {
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
            className="btn btn-success btn-sm subscribe-btn"
            data-subscribed="false"
          >
            <i className="fas fa-plus"></i> Subscribe
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
            className="btn btn-success btn-sm subscribe-btn"
            data-subscribed="false"
          >
            <i className="fas fa-plus"></i> Subscribe
          </button>
        </div>
        <div className="tutor-card">
          <div className="tutor-header">
            <img
              src="https://randomuser.me/api/portraits/men/22.jpg"
              alt="Tutor"
              className="tutor-avatar"
            />
            <div className="tutor-info">
              <h3>Dr. James Okafor</h3>
              <p>Algebra Expert</p>
              <div className="rating">
                <i className="fas fa-star"></i> 4.7
              </div>
            </div>
          </div>
          <div className="tutor-stats">
            <div className="stat">
              <div className="stat-value">4</div>
              <div className="stat-label">Subjects</div>
            </div>
            <div className="stat">
              <div className="stat-value">117</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          <div className="tutor-subjects">
            <span>MAT261</span>
            <span>MAT201</span>
            <span>PRG281</span>
            <span>MAT101</span>
          </div>
          <a href="#" className="view-profile" data-tutor="james">
            View Profile & Content
          </a>
          <button
            className="btn btn-success btn-sm subscribe-btn"
            data-subscribed="false"
          >
            <i className="fas fa-plus"></i> Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

export default FindTutors;
