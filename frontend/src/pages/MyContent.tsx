import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { apiBaseUrl } from "../lib/api";
import { getMyContent } from "../services/fileApi";
import type { TutorUpload } from "../types/tutorUploads";

// List of MIME types that can be safely displayed in a browser
const VIEWABLE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "video/mp4",
];

type Grouped = Record<string, Record<string, TutorUpload[]>>; // subject -> subtopic -> files

const MyContent = () => {
  const { user, token } = useAuthStore((s) => ({
    user: s.user,
    token: s.token,
  }));
  const [items, setItems] = useState<TutorUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TutorUpload | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (user?.role !== "tutor" || !token) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const files = await getMyContent(token);
        if (mounted) {
          setItems(files);
        }
      } catch (e) {
        if (mounted) {
          setError("Failed to load your content. Please try again later.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.role, token]);

  const grouped: Grouped = useMemo(() => {
    const out: Grouped = {};
    for (const f of items) {
      const subject = f.subject || "Uncategorized";
      const subtopic = f.subtopic || "General";
      out[subject] ||= {};
      out[subject][subtopic] ||= [];
      out[subject][subtopic].push(f);
    }
    return out;
  }, [items]);

  const handleViewClick = (file: TutorUpload) => {
    const isViewable = VIEWABLE_MIME_TYPES.some((type) =>
      file.contentType.startsWith(type),
    );

    if (isViewable) {
      setSelectedFile(file);
      setIsModalOpen(true);
    } else {
      // For non-viewable files, open in a new tab to trigger download
      const fileId = (file as any).id || (file as any)._id;
      window.open(`${apiBaseUrl}/files/${fileId}/binary`, "_blank");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const navigateToSubject = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedSubtopic(null);
    setCurrentPath([subject]);
  };

  const navigateToSubtopic = (subject: string, subtopic: string) => {
    setSelectedSubject(subject);
    setSelectedSubtopic(subtopic);
    setCurrentPath([subject, subtopic]);
  };

  const navigateToRoot = () => {
    setSelectedSubject(null);
    setSelectedSubtopic(null);
    setCurrentPath([]);
  };

  const navigateBack = () => {
    if (selectedSubtopic) {
      setSelectedSubtopic(null);
      setCurrentPath([selectedSubject!]);
    } else if (selectedSubject) {
      setSelectedSubject(null);
      setCurrentPath([]);
    }
  };

  // Filter items based on current navigation
  const filteredItems = useMemo(() => {
    if (!selectedSubject) return items;
    if (!selectedSubtopic) {
      return items.filter((item) => item.subject === selectedSubject);
    }
    return items.filter(
      (item) =>
        item.subject === selectedSubject && item.subtopic === selectedSubtopic,
    );
  }, [items, selectedSubject, selectedSubtopic]);

  return (
    <div className="content-view" id="mycontent-view">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-folder"></i>
          <span id="content-title">
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}'s Content`
              : "My Content"}
          </span>
        </h2>
      </div>

      <div className="content-browser">
        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-nav">
          <button
            className={`breadcrumb-item ${currentPath.length === 0 ? "active" : ""}`}
            onClick={navigateToRoot}
          >
            <i className="fas fa-home"></i> All Content
          </button>

          {currentPath.map((path, index) => (
            <React.Fragment key={index}>
              <i className="fas fa-chevron-right breadcrumb-separator"></i>
              <button
                className={`breadcrumb-item ${index === currentPath.length - 1 ? "active" : ""}`}
                onClick={() => {
                  if (index === 0) {
                    navigateToSubject(path);
                  } else {
                    navigateToSubtopic(currentPath[0], path);
                  }
                }}
              >
                {path}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div id="content-display">
          {user?.role !== "tutor" && (
            <div className="empty-state">
              <i className="fas fa-lock"></i>
              <p>Only tutors can view this page.</p>
            </div>
          )}

          {user?.role === "tutor" && (
            <>
              {loading && (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading your content...</p>
                </div>
              )}

              {error && (
                <div className="error-state">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>{error}</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && (
                <>
                  {items.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-folder-open"></i>
                      <p>No content yet. Start by uploading your first file!</p>
                      <button className="btn btn-primary">
                        <i className="fas fa-upload"></i> Upload Content
                      </button>
                    </div>
                  ) : (
                    <div className="content-grid">
                      {/* Show subjects when at root level */}
                      {!selectedSubject && (
                        <div className="subjects-container">
                          <div className="content-header">
                            <h3 className="content-section-title">Subjects</h3>
                          </div>
                          <div className="subjects-grid">
                            {Object.keys(grouped).map((subject) => (
                              <div
                                key={subject}
                                className="subject-card"
                                onClick={() => navigateToSubject(subject)}
                              >
                                <div className="subject-icon">
                                  <i className="fas fa-book"></i>
                                </div>
                                <div className="subject-info">
                                  <h4>{subject}</h4>
                                  <p>
                                    {Object.keys(grouped[subject]).length}{" "}
                                    subtopic(s)
                                  </p>
                                  <span className="file-count">
                                    {
                                      Object.values(grouped[subject]).flat()
                                        .length
                                    }{" "}
                                    files
                                  </span>
                                </div>
                                <i className="fas fa-chevron-right subject-arrow"></i>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show subtopics when a subject is selected */}
                      {selectedSubject && !selectedSubtopic && (
                        <div className="subtopics-container">
                          <div className="content-header">
                            <button
                              className="back-button"
                              onClick={navigateBack}
                            >
                              <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <h3 className="content-section-title">
                              {selectedSubject}
                            </h3>
                          </div>

                          <div className="subtopics-grid">
                            {Object.keys(grouped[selectedSubject]).map(
                              (subtopic) => (
                                <div
                                  key={subtopic}
                                  className="subtopic-card"
                                  onClick={() =>
                                    navigateToSubtopic(
                                      selectedSubject,
                                      subtopic,
                                    )
                                  }
                                >
                                  <div className="subtopic-icon">
                                    <i className="fas fa-folder"></i>
                                  </div>
                                  <div className="subtopic-info">
                                    <h4>{subtopic}</h4>
                                    <p>
                                      {
                                        grouped[selectedSubject][subtopic]
                                          .length
                                      }{" "}
                                      file(s)
                                    </p>
                                  </div>
                                  <i className="fas fa-chevron-right subtopic-arrow"></i>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show files when a subtopic is selected */}
                      {selectedSubject && selectedSubtopic && (
                        <div className="files-container">
                          <div className="content-header">
                            <button
                              className="back-button"
                              onClick={navigateBack}
                            >
                              <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <h3 className="content-section-title">
                              {selectedSubject}{" "}
                              <i className="fas fa-chevron-right"></i>{" "}
                              {selectedSubtopic}
                            </h3>
                          </div>

                          <div className="files-grid">
                            {grouped[selectedSubject][selectedSubtopic].map(
                              (file) => {
                                const fileId =
                                  (file as any).id || (file as any)._id;
                                const fileType = file.contentType.split("/")[0];
                                const fileIcon =
                                  fileType === "video"
                                    ? "fa-video"
                                    : fileType === "image"
                                      ? "fa-image"
                                      : fileType === "application" &&
                                          file.contentType.includes("pdf")
                                        ? "fa-file-pdf"
                                        : "fa-file";

                                return (
                                  <div key={fileId} className="file-card">
                                    <div className="file-icon">
                                      <i className={`fas ${fileIcon}`}></i>
                                    </div>
                                    <div className="file-info">
                                      <h4>{file.title}</h4>
                                      <p className="file-description">
                                        {file.description}
                                      </p>
                                      <div className="file-meta">
                                        <span className="file-type">
                                          {file.contentType}
                                        </span>
                                        <span className="file-date">
                                          {new Date(
                                            file.uploadDate || Date.now(),
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="file-actions">
                                      {VIEWABLE_MIME_TYPES.some((type) =>
                                        file.contentType.startsWith(type),
                                      ) && (
                                        <button
                                          className="btn btn-sm btn-primary"
                                          onClick={() => handleViewClick(file)}
                                        >
                                          <i className="fas fa-eye"></i> View
                                        </button>
                                      )}
                                      <a
                                        href={`${apiBaseUrl}/files/${fileId}/binary?download=true`}
                                        className="btn btn-sm btn-outline"
                                        download
                                      >
                                        <i className="fas fa-download"></i>{" "}
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && selectedFile && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedFile.title}</h3>
              <div className="modal-actions">
                <a
                  href={`${apiBaseUrl}/files/${(selectedFile as any).id || (selectedFile as any)._id}/binary?download=true`}
                  className="btn btn-sm btn-primary"
                  download
                >
                  <i className="fas fa-download"></i> Download
                </a>
                <button className="modal-close-btn" onClick={closeModal}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="modal-body">
              {selectedFile.contentType.startsWith("video/") ? (
                <video
                  src={`${apiBaseUrl}/files/${(selectedFile as any).id || (selectedFile as any)._id}/binary`}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "80vh" }}
                />
              ) : (
                <iframe
                  src={`${apiBaseUrl}/files/${(selectedFile as any).id || (selectedFile as any)._id}/binary`}
                  width="100%"
                  height="100%"
                  style={{ border: "none", minHeight: "60vh" }}
                  title={selectedFile.title}
                  allowFullScreen={true}
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyContent;
