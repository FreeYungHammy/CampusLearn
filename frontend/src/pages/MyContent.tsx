import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { apiBaseUrl } from "../lib/api";
import { deleteFile, getMyContent } from "../services/fileApi";
import type { TutorUpload } from "../types/tutorUploads";
import VideoPlayer from "../components/VideoPlayer";
import DocxViewer from "../components/DocxViewer";
import PageHeader from "../components/PageHeader";
import "../components/VideoPlayer.css";
import "./MyContent.css";

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

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
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<TutorUpload | null>(null);

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
      const fileId = (file as any).id || (file as any)._id;
      window.open(`${apiBaseUrl}/files/${fileId}/binary`, "_blank");
    }
  };

  const handleDeleteClick = (file: TutorUpload) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setFileToDelete(null);
    setIsDeleteModalOpen(false);
  };

  // ✅ FIXED confirmDelete with subject + subtopic edge cases
  const confirmDelete = async () => {
    if (!fileToDelete || !token) return;

    const fileId = (fileToDelete as any)._id || (fileToDelete as any).id;

    try {
      await deleteFile(token, fileId);

      // Update state
      const updatedItems = items.filter(
        (item) => ((item as any)._id || (item as any).id) !== fileId,
      );
      setItems(updatedItems);
      closeDeleteModal();

      if (selectedSubject && selectedSubtopic) {
        // Check if the current subtopic is now empty
        const remainingFilesInSubtopic = updatedItems.filter(
          (item) =>
            item.subject === selectedSubject &&
            item.subtopic === selectedSubtopic,
        );

        if (remainingFilesInSubtopic.length === 0) {
          // Subtopic empty → go back to subject
          setSelectedSubtopic(null);
          setCurrentPath([selectedSubject]);

          // Now check if the whole subject is empty
          const remainingFilesInSubject = updatedItems.filter(
            (item) => item.subject === selectedSubject,
          );

          if (remainingFilesInSubject.length === 0) {
            // Subject empty → go back to subject selector
            setSelectedSubject(null);
            setCurrentPath([]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
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
      <PageHeader
        title={
          user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}'s Content`
            : "My Content"
        }
        subtitle="Manage and organize your educational content"
        icon="fas fa-folder"
      />

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
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate("/upload")}
                      >
                        <i className="fas fa-upload"></i> Upload Content
                      </button>
                    </div>
                  ) : (
                    <div className="content-grid">
                      {/* Show subjects when at root level */}
                      {!selectedSubject && (
                        <div className="subjects-container">
                          <div className="subjects-grid">
                            {Object.keys(grouped).map((subject) => (
                              <div
                                key={subject}
                                className="subject-card enhanced"
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
                                <div className="subject-icon enhanced">
                                  <i className="fas fa-book"></i>
                                </div>
                                <div className="subject-info">
                                  <h4>{subject}</h4>

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
                          <div className="subtopics-grid">
                            {Object.keys(grouped[selectedSubject]).map(
                              (subtopic) => (
                                <div
                                  key={subtopic}
                                  className="subtopic-card enhanced"
                                  onClick={() =>
                                    navigateToSubtopic(
                                      selectedSubject,
                                      subtopic,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      navigateToSubtopic(
                                        selectedSubject,
                                        subtopic,
                                      );
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`View ${subtopic} files`}
                                >
                                  <div className="subtopic-icon enhanced">
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
                          <div className="results-info">
                            <h3 className="content-section-title">
                              {selectedSubject}{" "}
                              <i className="fas fa-chevron-right"></i>{" "}
                              {selectedSubtopic}
                            </h3>
                            <span className="results-count">
                              {filteredItems.length} file
                              {filteredItems.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {filteredItems.length === 0 ? (
                            <div className="empty-state">
                              <i className="fas fa-folder-open"></i>
                              <p>No files in this subtopic yet.</p>
                            </div>
                          ) : (
                            <div className="files-grid">
                              {filteredItems.map((file) => {
                                const fileId =
                                  (file as any).id || (file as any)._id;
                                const fileType = file.contentType.split("/")[0];
                                const fileIcon =
                                  fileType === "video"
                                    ? "fa-video"
                                    : fileType === "image"
                                      ? "fa-image"
                                      : file.contentType === "application/pdf"
                                        ? "fa-file-pdf"
                                        : file.contentType ===
                                              "application/msword" ||
                                            file.contentType ===
                                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                          ? "fa-file-word"
                                          : "fa-file";

                                const fileSize = (file as any).size
                                  ? `${((file as any).size / 1024 / 1024).toFixed(1)} MB`
                                  : "Unknown size";

                                // Get the actual file type for the badge
                                const getFileTypeBadge = (
                                  contentType: string,
                                ) => {
                                  if (contentType === "application/pdf")
                                    return "PDF";
                                  if (contentType === "application/msword")
                                    return "DOC";
                                  if (
                                    contentType ===
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  )
                                    return "DOCX";
                                  if (
                                    contentType === "application/vnd.ms-excel"
                                  )
                                    return "XLS";
                                  if (
                                    contentType ===
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                  )
                                    return "XLSX";
                                  if (
                                    contentType ===
                                    "application/vnd.ms-powerpoint"
                                  )
                                    return "PPT";
                                  if (
                                    contentType ===
                                    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                  )
                                    return "PPTX";
                                  if (contentType.startsWith("image/"))
                                    return "IMAGE";
                                  if (contentType.startsWith("video/"))
                                    return "VIDEO";
                                  if (contentType.startsWith("text/"))
                                    return "TEXT";
                                  if (contentType.startsWith("application/"))
                                    return "APP";
                                  return (
                                    contentType.split("/")[1]?.toUpperCase() ||
                                    "FILE"
                                  );
                                };

                                return (
                                  <div
                                    key={fileId}
                                    className="file-card enhanced"
                                  >
                                    <div className="file-header">
                                      <div className="file-icon">
                                        <i className={`fas ${fileIcon}`}></i>
                                      </div>
                                      <div className="file-badge">
                                        {getFileTypeBadge(file.contentType)}
                                      </div>
                                    </div>
                                    <div className="file-info">
                                      <h4 className="file-title">
                                        {file.title}
                                      </h4>
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
                                      {file.contentType !==
                                        "application/pdf" && (
                                        <a
                                          href={`${apiBaseUrl}/files/${fileId}/binary?download=true`}
                                          className="btn btn-sm btn-outline-download"
                                          download
                                        >
                                          <i className="fas fa-download"></i>{" "}
                                          Download
                                        </a>
                                      )}
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDeleteClick(file)}
                                      >
                                        <i className="fas fa-trash"></i> Delete
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
          <div
            className={`modal-content ${VIEWABLE_MIME_TYPES.some((type) => selectedFile.contentType.startsWith(type)) ? "content-viewer-modal" : ""} ${selectedFile.contentType.startsWith("image/") ? "image-modal" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
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
                const fileUrl = `${apiBaseUrl}/files/${fileId}/binary`;

                // On localhost, use the local viewer for Word docs
                if (isLocalhost && isWordDoc) {
                  return <DocxViewer file={selectedFile} />;
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
                    style={{ border: "none" }}
                    title={selectedFile.title}
                    allowFullScreen={true}
                  ></iframe>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && fileToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="modal-close-btn" onClick={closeDeleteModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the file:{" "}
                <strong>{fileToDelete.title}</strong>?
              </p>
              <p className="text-danger">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyContent;
