import Dialog from "./ui/Dialog";

interface SavePictureConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function SavePictureConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: SavePictureConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="save-picture-title">
      <h2 id="save-picture-title" className="modal-title">
        Confirm Save Picture
      </h2>
      <p className="modal-body">
        Are you sure you want to save this picture as your profile picture?
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
