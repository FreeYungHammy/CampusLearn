import Dialog from "./ui/Dialog";

interface UpdatePasswordConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function UpdatePasswordConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: UpdatePasswordConfirmationModalProps) {
  return (
    <Dialog
      isOpen={show}
      onClose={onClose}
      labelledById="update-password-title"
    >
      <h2 id="update-password-title" className="modal-title">
        Confirm Update Password
      </h2>
      <p className="modal-body">
        Are you sure you want to update your password?
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
          {isSubmitting ? "Updating..." : "Yes, Update"}
        </button>
      </div>
    </Dialog>
  );
}
