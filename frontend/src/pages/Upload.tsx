import React, { useState } from "react";

const Upload = () => {
  const [subject, setSubject] = useState("");
  const [subtopics, setSubtopics] = useState([]);

  const subjectSubtopicMap = {
    Mathematics: [
      "Calculus",
      "Algebra",
      "Integration",
      "Statistics",
      "Geometry",
    ],
    "Computer Science": [
      "Programming",
      "Databases",
      "Web Development",
      "Algorithms",
      "Data Structures",
    ],
    Business: ["Finance", "Marketing", "Management", "Accounting", "Economics"],
  };

  const handleSubjectChange = (e) => {
    const selectedSubject = e.target.value;
    setSubject(selectedSubject);
    setSubtopics(subjectSubtopicMap[selectedSubject] || []);
  };

  return (
    <div className="content-view" id="upload-view">
      <h2 className="section-title">
        <i className="fas fa-upload"></i>Upload Learning Materials
      </h2>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-plus-circle"></i>Add New Content
          </div>
        </div>
        <div className="card-body">
          <div className="upload-area">
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div className="upload-text">
              <p>Drag & drop files here or click to browse</p>
            </div>
            <button className="btn btn-outline">
              <i className="fas fa-folder-open"></i> Select Files
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-book"></i>Subject
            </label>
            <select
              className="form-control"
              id="subject-select"
              onChange={handleSubjectChange}
              value={subject}
            >
              <option value="">Select a subject</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Business">Business</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-tag"></i>Subtopic
            </label>
            <select className="form-control" id="subtopic-select">
              <option value="">Select a subtopic</option>
              {subtopics.map((subtopic) => (
                <option key={subtopic} value={subtopic}>
                  {subtopic}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-align-left"></i>Description
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter a description for this content"
            />
          </div>
          <button className="btn btn-primary">Upload Content</button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
