import React, { useState } from "react";
import Dialog from "./ui/Dialog";

interface DeleteAccountConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isSubmitting: boolean;
}

export default function DeleteAccountConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteAccountConfirmationModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setError("");
    onConfirm(password);
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog
      isOpen={show}
      onClose={handleClose}
      labelledById="delete-account-title"
    >
      <h2 id="delete-account-title" className="modal-title">
        Confirm Account Deletion
      </h2>
      <div className="modal-body">
        <p style={{ marginBottom: "1rem", color: "var(--danger)" }}>
          ⚠️ This action cannot be undone. All your data will be permanently
          deleted including:
        </p>
        <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Your profile and account information</li>
          <li>All your messages and conversations</li>
          <li>Forum posts and replies</li>
          <li>Uploaded content and files</li>
          <li>Bookings and subscriptions</li>
        </ul>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label htmlFor="delete-password" className="form-label">
              Enter your password to confirm:
            </label>
            <input
              id="delete-password"
              type="password"
              className={`form-control ${error ? "is-invalid" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              disabled={isSubmitting}
              autoFocus
            />
            {error && (
              <div
                className="text-danger"
                style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}
              >
                {error}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-primary modal-confirm-btn"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger-solid"
          disabled={isSubmitting || !password.trim()}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Deleting Account..." : "Delete My Account"}
        </button>
      </div>
    </Dialog>
  );
}
