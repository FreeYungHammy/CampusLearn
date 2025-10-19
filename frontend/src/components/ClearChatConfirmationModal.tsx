import Dialog from "./ui/Dialog";

interface ClearChatConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  userName: string;
}

export default function ClearChatConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
  userName,
}: ClearChatConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="clear-chat-title">
      <h2 id="clear-chat-title" className="modal-title">
        Confirm Clear Messages
      </h2>
      <p className="modal-body">
        Are you sure you want to permanently delete your entire chat history
        with {userName}? This action cannot be undone.
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
          className="btn btn-danger-solid modal-clear-btn"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? "Clearing..." : "Yes, Clear History"}
        </button>
      </div>
    </Dialog>
  );
}
