import Dialog from "./ui/Dialog";

interface SubscribeConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  tutorName: string;
}

export default function SubscribeConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
  tutorName,
}: SubscribeConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="subscribe-title">
      <h2 id="subscribe-title" className="modal-title">
        Confirm Subscription
      </h2>
      <p className="modal-body">
        Are you sure you want to subscribe to {tutorName}?
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
          {isSubmitting ? "Subscribing..." : "Yes, Subscribe"}
        </button>
      </div>
    </Dialog>
  );
}
