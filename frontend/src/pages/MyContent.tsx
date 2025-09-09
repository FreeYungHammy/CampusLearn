import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import api, { apiBaseUrl } from "../lib/api";
import type { TutorUpload } from "../types/tutorUploads";

type Grouped = Record<string, Record<string, TutorUpload[]>>; // subject -> subtopic -> files

const MyContent = () => {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<TutorUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (user?.role !== "tutor") return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Resolve this tutor's profile by the current user id, then fetch files by tutorId
        const currentUserId = String(
          (user as any)?.id || (user as any)?._id || "",
        ).replace(/[<>\s]/g, "");
        // Try direct files by user first (new public convenience endpoint)
        const direct = await api.get(`/files/by-user/${currentUserId}`);
        let files = direct.data as TutorUpload[];
        if (!Array.isArray(files) || files.length === 0) {
          // Fallback to tutor profile → by-tutor
          const tutorRes = await api.get(`/tutors/by-user/${currentUserId}`);
          const tutor = tutorRes.data;
          const tutorId = (tutor as any)?.id || (tutor as any)?._id;
          if (!tutorId) throw new Error("Tutor profile not found");
          const byTutorRes = await api.get(`/files/by-tutor/${tutorId}`);
          files = byTutorRes.data as TutorUpload[];
        }

        if (mounted) setItems(files);
      } catch (e) {
        if (mounted) setError("Failed to load your content");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, (user as any)?._id, user?.role]);

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
                  {/* Subjects grid */}
                  <div className="subject-list">
                    {Object.keys(grouped).length === 0 && (
                      <p style={{ padding: 16 }}>No content yet.</p>
                    )}
                    {Object.entries(grouped).map(([subject, subtopics]) => (
                      <div key={subject} className="subject-item">
                        <h3>{subject}</h3>
                        <p>{Object.keys(subtopics).length} subtopic(s)</p>

                        {/* Subtopics grid */}
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
                                        <a
                                          className="btn btn-sm btn-outline"
                                          href={`${apiBaseUrl}/files/${fileId}/binary`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <i className="fas fa-download"></i>{" "}
                                          Download
                                        </a>
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyContent;
