import Dialog from "./ui/Dialog";

interface DeleteAccountConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function DeleteAccountConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteAccountConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="delete-account-title">
      <h2 id="delete-account-title" className="modal-title">
        Confirm Account Deletion
      </h2>
      <p className="modal-body">
        Are you sure you want to delete your account? This action cannot be
        undone.
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
          className="btn btn-danger-solid"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? "Deleting..." : "Yes, Delete My Account"}
        </button>
      </div>
    </Dialog>
  );
}
