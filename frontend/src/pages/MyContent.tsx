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

  return (
    <div className="content-view" id="mycontent-view">
      <h2 className="section-title">
        <i className="fas fa-folder"></i>
        <span id="content-title">My Content</span>
      </h2>
      <div className="content-browser">
        <div className="breadcrumb">
          <a href="#">My Content</a>
        </div>
        <div id="content-display">
          {user?.role !== "tutor" && (
            <p style={{ padding: 16 }}>Only tutors can view this page.</p>
          )}
          {user?.role === "tutor" && (
            <>
              {loading && <p style={{ padding: 16 }}>Loading…</p>}
              {error && (
                <p style={{ padding: 16, color: "var(--danger)" }}>{error}</p>
              )}
              {!loading && !error && (
                <>
                  {items.length === 0 ? (
                    <p style={{ padding: 16 }}>No content yet.</p>
                  ) : (
                    <div className="subject-list">
                      {Object.entries(grouped).map(([subject, subtopics]) => (
                        <div key={subject} className="subject-item">
                          <h3>{subject}</h3>
                          <p>{Object.keys(subtopics).length} subtopic(s)</p>

                          <div
                            className="subtopic-list"
                            style={{ marginTop: 12 }}
                          >
                            {Object.entries(subtopics).map(([sub, files]) => (
                              <div
                                key={subject + ":" + sub}
                                className="subtopic-item"
                              >
                                <h3>{sub}</h3>
                                <p>{files.length} file(s)</p>

                                <div className="file-list">
                                  {files.map((f) => {
                                    const fileId =
                                      (f as any).id || (f as any)._id;
                                    return (
                                      <div key={fileId} className="file-item">
                                        <div className="file-icon-sm">
                                          <i className="fas fa-file" />
                                        </div>
                                        <div className="file-info">
                                          <h4>{f.title}</h4>
                                          <p>{f.description}</p>
                                        </div>
                                        <div className="file-actions">
                                          <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handleViewClick(f)}
                                          >
                                            <i className="fas fa-eye"></i> View
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
              <div>
                <a
                  href={`${apiBaseUrl}/files/${(selectedFile as any).id || (selectedFile as any)._id}/binary?download=true`}
                  className="btn btn-sm btn-primary"
                  style={{ marginRight: "1rem" }}
                >
                  <i className="fas fa-download"></i> Download
                </a>
                <button className="modal-close-btn" onClick={closeModal}>
                  &times;
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
                  style={{ border: "none" }}
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
