import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { apiBaseUrl } from "../../lib/api";
import { getTutorContent } from "../../services/fileApi";
import type { TutorUpload } from "../../types/tutorUploads";
import VideoPlayer from "../../components/VideoPlayer";
import DocxViewer from "../../components/DocxViewer";
import "../../components/VideoPlayer.css";
import "./TutorContentView.css";
import { getTutorById } from "../../services/tutorApi";
import type { Tutor } from "../../types/Tutors";

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const VIEWABLE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "video/mp4",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// List of MIME types for which to use the local DocxViewer
const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// List of MIME types for which to use the production Office viewer
const OFFICE_MIME_TYPES = [
  ...WORD_MIME_TYPES,
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

type Grouped = Record<string, Record<string, TutorUpload[]>>;

const TutorContentView = () => {
  const { tutorId } = useParams<{ tutorId: string }>();
  const { token } = useAuthStore();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [items, setItems] = useState<TutorUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TutorUpload | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!tutorId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tutorData, files] = await Promise.all([
          getTutorById(tutorId),
          getTutorContent(tutorId, token || undefined),
        ]);
        if (mounted) {
          setTutor(tutorData);
          setItems(files);
        }
      } catch (e) {
        if (mounted) {
          setError("Failed to load content. Please try again later.");
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
  }, [tutorId]);

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

  // Helper function to generate authenticated download URL
  const getDownloadUrl = (fileId: string) => {
    const baseUrl = `${apiBaseUrl}/files/${fileId}/binary?download=true`;
    return token ? `${baseUrl}&token=${token}` : baseUrl;
  };

  const handleViewClick = (file: TutorUpload) => {
    const isViewable = VIEWABLE_MIME_TYPES.some((type) =>
      file.contentType.startsWith(type),
    );
    if (isViewable) {
      setSelectedFile(file);
      setIsModalOpen(true);
    } else {
      const fileId = (file as any).id || (file as any)._id;
      const binaryUrl = `${apiBaseUrl}/files/${fileId}/binary${token ? `?token=${token}` : ''}`;
      window.open(binaryUrl, "_blank");
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

  return (
    <div className="content-view" id="tutor-content-view">
      <div
        className="section-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 className="section-title">
          <i className="fas fa-folder"></i>
          <span id="content-title">
            {tutor
              ? `${tutor.name} ${tutor.surname}'s Content`
              : "Tutor Content"}
          </span>
        </h2>
        <button className="btn btn-secondary" onClick={handleGoBack}>
          <i className="fas fa-arrow-left"></i> Back to Tutors
        </button>
      </div>

      <div className="content-browser">
        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-nav">
          <div className="breadcrumb-items">
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
        </div>

        {/* Back Button - Top Right */}
        {currentPath.length > 0 && (
          <button className="back-button-top-right" onClick={navigateBack}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        )}

        <div id="content-display">
          <h3 className="content-section-title">
            {currentPath.length === 0
              ? "Subjects"
              : currentPath.length === 1
                ? `Folders in ${currentPath[0]}`
                : `Files in ${currentPath[currentPath.length - 1]}`}
          </h3>

          {loading && (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading content...</p>
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
                  <p>This tutor has not uploaded any content yet.</p>
                </div>
              ) : (
                <>
                  {!selectedSubject && (
                    <div className="subjects-container">
                      <div className="subjects-grid">
                        {Object.keys(grouped).map((subject) => (
                          <div
                            key={subject}
                            className="subject-card"
                            onClick={() => navigateToSubject(subject)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigateToSubject(subject);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`View ${subject} content`}
                          >
                            <div className="subject-icon">
                              <i className="fas fa-book"></i>
                            </div>
                            <div className="subject-info">
                              <h4>{subject}</h4>
                              <span className="file-count">
                                {Object.values(grouped[subject]).flat().length}{" "}
                                files
                              </span>
                            </div>
                            <i className="fas fa-chevron-right subject-arrow"></i>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubject && !selectedSubtopic && (
                    <div className="subtopics-container">
                      <div className="subtopics-grid">
                        {Object.keys(grouped[selectedSubject]).map(
                          (subtopic) => (
                            <div
                              key={subtopic}
                              className="subtopic-card"
                              onClick={() =>
                                navigateToSubtopic(selectedSubject, subtopic)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigateToSubtopic(selectedSubject, subtopic);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`View ${subtopic} files`}
                            >
                              <div className="subtopic-icon">
                                <i className="fas fa-folder"></i>
                              </div>
                              <div className="subtopic-info">
                                <h4>{subtopic}</h4>
                                <p>
                                  {grouped[selectedSubject][subtopic].length}{" "}
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

                  {selectedSubject && selectedSubtopic && (
                    <div className="files-container">
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
                                  : file.contentType.includes("pdf")
                                    ? "fa-file-pdf"
                                    : "fa-file";

                            return (
                              <div key={fileId} className="file-card">
                                <div className="file-icon">
                                  <i className={`fas ${fileIcon}`}></i>
                                </div>
                                <div className="file-info">
                                  <h4 className="file-name">{file.title}</h4>
                                  {file.description && (
                                    <p className="file-description">
                                      {file.description}
                                    </p>
                                  )}
                                  <div className="file-meta">
                                    <div className="meta-item">
                                      <i className="fas fa-calendar"></i>
                                      <span>
                                        {new Date(
                                          file.uploadDate || Date.now(),
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="meta-item">
                                      <i className="fas fa-weight-hanging"></i>
                                      <span>
                                        {file.size
                                          ? formatBytes(file.size)
                                          : "Unknown size"}
                                      </span>
                                    </div>
                                    {file.subject && (
                                      <div className="meta-item">
                                        <i className="fas fa-book"></i>
                                        <span>{file.subject}</span>
                                      </div>
                                    )}
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
                                    href={getDownloadUrl(fileId)}
                                    className="btn btn-sm btn-outline"
                                    download
                                  >
                                    <i className="fas fa-download"></i> Download
                                  </a>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
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
          <div
            className={`modal-content ${VIEWABLE_MIME_TYPES.some((type) => selectedFile.contentType.startsWith(type)) ? "content-viewer-modal" : ""} ${selectedFile.contentType.startsWith("image/") ? "image-modal" : ""} ${selectedFile.contentType.startsWith("application/pdf") ? "pdf-modal" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{selectedFile.title}</h3>
              <div className="modal-actions">
                <a
                  href={getDownloadUrl(
                    (selectedFile as any).id || (selectedFile as any)._id,
                  )}
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
              {(() => {
                const isWordDoc = WORD_MIME_TYPES.some((type) =>
                  selectedFile.contentType.startsWith(type),
                );
                const isOfficeDoc = OFFICE_MIME_TYPES.some((type) =>
                  selectedFile.contentType.startsWith(type),
                );
                const isLocalhost = window.location.hostname === "localhost";

                const fileId =
                  (selectedFile as any).id || (selectedFile as any)._id;
                const fileUrl = `${apiBaseUrl}/files/${fileId}/binary${token ? `?token=${token}` : ''}`;

                // On localhost, use the local viewer for Word docs
                if (isLocalhost && isWordDoc) {
                  return <DocxViewer file={selectedFile} token={token || undefined} />;
                }

                // On a deployed server, use the MS viewer for any Office doc
                if (!isLocalhost && isOfficeDoc) {
                  return (
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                        fileUrl,
                      )}`}
                      width="100%"
                      height="100%"
                      style={{ border: "none", minHeight: "80vh" }}
                      title={selectedFile.title}
                      allowFullScreen={true}
                    ></iframe>
                  );
                }

                // Handle images specially - display in true size
                if (selectedFile.contentType.startsWith("image/")) {
                  return (
                    <img
                      src={fileUrl}
                      alt={selectedFile.title}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                      }}
                      onLoad={(e) => {
                        // Get the natural dimensions of the image
                        const img = e.target as HTMLImageElement;
                        const naturalWidth = img.naturalWidth;
                        const naturalHeight = img.naturalHeight;

                        // Update modal size based on image dimensions
                        const modalContent = document.querySelector(
                          ".content-viewer-modal",
                        ) as HTMLElement;
                        if (modalContent) {
                          // Calculate appropriate size while respecting viewport limits
                          const maxWidth = window.innerWidth * 0.95;
                          const maxHeight = window.innerHeight * 0.95;

                          let newWidth = naturalWidth;
                          let newHeight = naturalHeight;

                          // Scale down if image is too large
                          if (
                            naturalWidth > maxWidth ||
                            naturalHeight > maxHeight
                          ) {
                            const scaleX = maxWidth / naturalWidth;
                            const scaleY = maxHeight / naturalHeight;
                            const scale = Math.min(scaleX, scaleY);

                            newWidth = naturalWidth * scale;
                            newHeight = naturalHeight * scale;
                          }

                          // Calculate header height dynamically
                          const headerHeight = 60; // Approximate header height
                          const padding = 20; // Total padding (5px top + 5px bottom + 10px margin)
                          const minHeaderWidth = 400; // Minimum width to accommodate header buttons
                          const maxModalHeight = window.innerHeight * 0.8; // 80% of viewport height

                          // Determine if image is small enough to fit without scrolling
                          const imageFitsInViewport =
                            newHeight <= maxModalHeight;

                          let modalWidth, modalHeight;

                          if (imageFitsInViewport) {
                            // Small image: modal fits exactly to image size
                            modalWidth = Math.max(
                              newWidth + 20,
                              minHeaderWidth,
                            );
                            modalHeight = newHeight + headerHeight + padding;
                          } else {
                            // Large image: modal constrained to viewport with scrolling
                            modalWidth = Math.max(
                              newWidth + 20,
                              minHeaderWidth,
                            );
                            modalHeight =
                              maxModalHeight + headerHeight + padding;
                          }

                          // Set modal dimensions with precise calculations
                          modalContent.style.width = `${modalWidth}px`;
                          modalContent.style.height = `${modalHeight}px`;
                          modalContent.style.maxWidth = "95vw";
                          modalContent.style.maxHeight = "95vh";
                          modalContent.style.minWidth = `${minHeaderWidth}px`;
                          modalContent.style.minHeight = "100px";
                        }
                      }}
                    />
                  );
                }

                // Fallback for videos
                if (selectedFile.contentType.startsWith("video/")) {
                  return (
                    <VideoPlayer
                      src={fileUrl}
                      title={selectedFile.title}
                      fileId={fileId}
                      style={{ width: "auto", height: "auto" }}
                    />
                  );
                }

                // Fallback for PDFs and other viewable types
                return (
                  <iframe
                    src={fileUrl}
                    width="100%"
                    height="100%"
                    style={{ border: "none", minHeight: "80vh" }}
                    title={selectedFile.title}
                    allowFullScreen={true}
                  ></iframe>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorContentView;
