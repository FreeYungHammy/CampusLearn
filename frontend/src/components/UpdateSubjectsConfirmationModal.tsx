import Dialog from "./ui/Dialog";

interface UpdateSubjectsConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function UpdateSubjectsConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
}: UpdateSubjectsConfirmationModalProps) {
  return (
    <Dialog
      isOpen={show}
      onClose={onClose}
      labelledById="update-subjects-title"
    >
      <h2 id="update-subjects-title" className="modal-title">
        Confirm Update Subjects
      </h2>
      <p className="modal-body">
        Are you sure you want to update your subjects?
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
