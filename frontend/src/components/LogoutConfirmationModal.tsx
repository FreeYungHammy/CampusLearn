import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dialog from "./ui/Dialog";
import { useAuthStore } from "../store/authStore";

export default function LogoutConfirmationModal() {
  const show = useAuthStore((s) => s.showLogoutModal);
  const close = useAuthStore((s) => s.closeLogoutModal);
  const doLogout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await doLogout();
      // after logout, also close modal just to be safe
      close();
      // Navigate to landing page by forcing a refresh
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={show} onClose={close} labelledById="logout-title">
      <div className="modal-actions">
        <div className="modal-content-text">
          <h2 id="logout-title" className="modal-title">
            Confirm Logout
          </h2>
          <p className="modal-body">Are you sure you want to end your session?</p>
        </div>
        
        <div className="modal-buttons">
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={onConfirm}
          >
            <i className="fas fa-sign-out-alt"></i>
            {busy ? "Logging out…" : "Logout"}
          </button>
          <button type="button" className="btn btn-outline" onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
