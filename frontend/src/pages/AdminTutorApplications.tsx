import React, { useEffect, useMemo, useState } from "react";
import http from "../services/http";
import { useAuthStore } from "../store/authStore";
import "./Admin.css";

type Application = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subjects: string[];
  submittedAt?: string;
};

const AdminTutorApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [applicationToReject, setApplicationToReject] = useState<string | null>(
    null,
  );
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [applicationToApprove, setApplicationToApprove] = useState<
    string | null
  >(null);
  const { token } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  const selected = useMemo(
    () => applications.find((a) => a._id === selectedId) || null,
    [applications, selectedId],
  );

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await http.get("/applications");
      setApplications(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 420);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const approve = async (id: string) => {
    setApplicationToApprove(id);
    setApproveModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!applicationToApprove) return;
    setActionBusy(applicationToApprove);
    try {
      await http.post(`/applications/${applicationToApprove}/approve`);
      setApplications((prev) =>
        prev.filter((a) => a._id !== applicationToApprove),
      );
      if (selectedId === applicationToApprove) setSelectedId(null);
      setApproveModalOpen(false);
      setApplicationToApprove(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Approve failed");
    } finally {
      setActionBusy(null);
    }
  };

  const cancelApprove = () => {
    setApproveModalOpen(false);
    setApplicationToApprove(null);
  };

  const reject = async (id: string) => {
    setApplicationToReject(id);
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!applicationToReject) return;
    setActionBusy(applicationToReject);
    try {
      await http.delete(`/applications/${applicationToReject}`);
      setApplications((prev) =>
        prev.filter((a) => a._id !== applicationToReject),
      );
      if (selectedId === applicationToReject) setSelectedId(null);
      setRejectModalOpen(false);
      setApplicationToReject(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Reject failed");
    } finally {
      setActionBusy(null);
    }
  };

  const cancelReject = () => {
    setRejectModalOpen(false);
    setApplicationToReject(null);
  };

  const pdfUrl = (id: string) => {
    const base = (http as any).defaults.baseURL as string;
    const t = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${base}/applications/${id}/pdf${t}`;
  };

  return (
    <div className="admin-tutor-applications">
      <div className="applications-header">
        <h1 className="applications-title">
          <i className="fas fa-user-graduate"></i> Tutor Applications
        </h1>
        <p className="applications-subtitle">
          Review and approve/reject tutor applications
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 24 }}>
          <i className="fas fa-spinner fa-spin" /> Loading applications…
        </div>
      ) : (
        <div
          className="cards"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {applications.map((app) => (
            <div
              key={app._id}
              className="card"
              style={{
                width: "100%",
                padding: 16,
                background: "var(--card-bg, #1f2937)",
                borderRadius: 12,
                border: "1px solid var(--card-border, #374151)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong>
                  {app.firstName} {app.lastName}
                </strong>
                <span className="badge" style={{ fontSize: 12, opacity: 0.8 }}>
                  {app.email}
                </span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ opacity: 0.8 }}>Subjects:</span>{" "}
                {app.subjects?.length ? app.subjects.join(", ") : "—"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedId(app._id)}
                >
                  <i className="fas fa-eye" /> View
                </button>
                <button
                  className="btn btn-success"
                  disabled={actionBusy === app._id}
                  onClick={() => approve(app._id)}
                >
                  {actionBusy === app._id ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-check" />
                  )}{" "}
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  disabled={actionBusy === app._id}
                  onClick={() => reject(app._id)}
                >
                  {actionBusy === app._id ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-times" />
                  )}{" "}
                  Reject
                </button>
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <div style={{ opacity: 0.8, padding: 24 }}>
              No pending applications.
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: isMobile ? "stretch" : "center",
            zIndex: 9999,
            paddingTop: isMobile ? 0 : "60px",
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="modal-content pdf-modal"
            style={{
              width: isMobile ? "100vw" : "min(1200px, 98vw)",
              height: isMobile ? ("100dvh" as any) : "calc(90vh - 60px)",
              background: "var(--modal-bg, #111827)",
              borderRadius: isMobile ? 0 : 12,
              border: "1px solid var(--card-border, #374151)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--card-border, #374151)",
              }}
            >
              <strong>Transcript Preview</strong>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <iframe
                title="Qualification PDF"
                src={pdfUrl(selected._id)}
                style={{ width: "100%", height: "100%", border: 0 }}
                allow="fullscreen"
              />
              {/* Fallback link for mobile Safari where inline PDF may not render */}
              <div style={{ padding: 8, textAlign: "center" }}>
                <a
                  href={pdfUrl(selected._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  Open PDF in new tab
                </a>
              </div>
            </div>
            <div
              className="modal-footer"
              style={{
                padding: 12,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                borderTop: "1px solid var(--card-border, #374151)",
              }}
            >
              <button
                className="btn btn-danger"
                disabled={actionBusy === selected._id}
                onClick={() => reject(selected._id)}
                style={{
                  padding: "8px 16px",
                  background: "var(--danger, #dc3545)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {actionBusy === selected._id ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-times" />
                )}{" "}
                Reject
              </button>
              <button
                className="btn btn-success"
                disabled={actionBusy === selected._id}
                onClick={() => approve(selected._id)}
                style={{
                  padding: "8px 16px",
                  background: "var(--success, #28a745)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {actionBusy === selected._id ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-check" />
                )}{" "}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={cancelReject}
        >
          <div
            className="modal-content delete-modal"
            style={{
              width: "90%",
              maxWidth: "500px",
              background: "var(--modal-bg, #111827)",
              borderRadius: 12,
              border: "1px solid var(--card-border, #374151)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--card-border, #374151)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Confirm Rejection
              </h3>
              <button
                className="modal-close-btn"
                onClick={cancelReject}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                Are you sure you want to reject this tutor application?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--text-danger, #e74c3c)",
                  fontWeight: 600,
                }}
              >
                This action cannot be undone.
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                padding: 20,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                borderTop: "1px solid var(--card-border, #374151)",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={cancelReject}
                style={{
                  padding: "10px 20px",
                  background: "var(--gray, #6c757d)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmReject}
                disabled={actionBusy === applicationToReject}
                style={{
                  padding: "10px 20px",
                  background: "var(--danger, #dc3545)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {actionBusy === applicationToReject ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-times" />
                )}{" "}
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={cancelApprove}
        >
          <div
            className="modal-content delete-modal"
            style={{
              width: "90%",
              maxWidth: "500px",
              background: "var(--modal-bg, #111827)",
              borderRadius: 12,
              border: "1px solid var(--card-border, #374151)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--card-border, #374151)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Confirm Approval
              </h3>
              <button
                className="modal-close-btn"
                onClick={cancelApprove}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                Are you sure you want to approve this tutor application?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--text-success, #2ecc71)",
                  fontWeight: 600,
                }}
              >
                This will grant the applicant tutor access to the platform.
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                padding: 20,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                borderTop: "1px solid var(--card-border, #374151)",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={cancelApprove}
                style={{
                  padding: "10px 20px",
                  background: "var(--gray, #6c757d)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={confirmApprove}
                disabled={actionBusy === applicationToApprove}
                style={{
                  padding: "10px 20px",
                  background: "var(--success, #28a745)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {actionBusy === applicationToApprove ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-check" />
                )}{" "}
                Approve Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTutorApplications;
