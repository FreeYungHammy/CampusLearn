import Dialog from "./ui/Dialog";

interface SaveProfileConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function SaveProfileConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: SaveProfileConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="save-profile-title">
      <h2 id="save-profile-title" className="modal-title">
        Confirm Save Profile
      </h2>
      <p className="modal-body">
        Are you sure you want to save the changes to your profile?
      </p>

      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-primary modal-confirm-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-success-solid"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? "Saving..." : "Yes, Save"}
        </button>
      </div>
    </Dialog>
  );
}
