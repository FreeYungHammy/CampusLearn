import React, { useState } from 'react';
import './SubjectSelector.css';

interface SubjectSelectorProps {
  selectedSubjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  availableSubjects?: string[];
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  selectedSubjects,
  onSubjectsChange,
  availableSubjects = [
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
  ],
  label = "Subjects",
  required = false,
  placeholder = "Select subjects"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddSubject = (subject: string) => {
    if (!selectedSubjects.includes(subject)) {
      onSubjectsChange([...selectedSubjects, subject]);
    }
  };

  const handleRemoveSubject = (subject: string) => {
    onSubjectsChange(selectedSubjects.filter(s => s !== subject));
  };

  const getSubjectIcon = (subject: string) => {
    const iconMap: { [key: string]: string } = {
      "Programming": "fa-code",
      "Mathematics": "fa-calculator",
      "Linear Programming": "fa-chart-line",
      "Database Development": "fa-database",
      "Web Programming": "fa-globe",
      "Computer Architecture": "fa-microchip",
      "Statistics": "fa-chart-bar",
      "Software Testing": "fa-bug",
      "Network Development": "fa-network-wired",
      "Machine Learning": "fa-brain",
    };
    return iconMap[subject] || "fa-book";
  };

  const filteredAvailableSubjects = availableSubjects.filter(
    subject => !selectedSubjects.includes(subject)
  );

  return (
    <div className="subject-selector">
      <label className="subject-selector-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      
      {/* Selected Subjects Display */}
      <div className="selected-subjects-container">
        {selectedSubjects.length > 0 ? (
          <div className="subjects-grid">
            {selectedSubjects.map((subject) => (
              <div key={subject} className="subject-chip selected">
                <i className={`fas ${getSubjectIcon(subject)}`}></i>
                <span>{subject}</span>
                <button
                  className="remove-subject-btn"
                  onClick={() => handleRemoveSubject(subject)}
                  title="Remove subject"
                  type="button"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-subjects-selected">
            <i className="fas fa-plus"></i>
            <span>{placeholder}</span>
          </div>
        )}
      </div>

      {/* Available Subjects Dropdown */}
      <div className="available-subjects-dropdown">
        <button
          type="button"
          className="dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <i className="fas fa-plus"></i>
          Add Subject
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </button>
        
        {isOpen && (
          <div className="dropdown-menu">
            {filteredAvailableSubjects.length > 0 ? (
              <div className="subjects-grid">
                {filteredAvailableSubjects.map((subject) => (
                  <div key={subject} className="subject-chip available">
                    <i className={`fas ${getSubjectIcon(subject)}`}></i>
                    <span>{subject}</span>
                    <button
                      className="add-subject-btn"
                      onClick={() => handleAddSubject(subject)}
                      title="Add subject"
                      type="button"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-available-subjects">
                <i className="fas fa-check"></i>
                <span>All subjects selected</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectSelector;
