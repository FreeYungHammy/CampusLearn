import Dialog from "./ui/Dialog";

interface UnsubscribeConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  tutorName: string;
}

export default function UnsubscribeConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
  tutorName,
}: UnsubscribeConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="unsubscribe-title">
      <h2 id="unsubscribe-title" className="modal-title">
        Confirm Unsubscription
      </h2>
      <p className="modal-body">
        Are you sure you want to unsubscribe from {tutorName}?
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
          {isSubmitting ? "Unsubscribing..." : "Yes, Unsubscribe"}
        </button>
      </div>
    </Dialog>
  );
}
