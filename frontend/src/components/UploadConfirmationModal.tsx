import Dialog from "./ui/Dialog";
interface UploadConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  fileName: string | null;
}

export default function UploadConfirmationModal({
  show,
  onClose,
  onConfirm,
  isSubmitting,
  fileName,
}: UploadConfirmationModalProps) {
  return (
    <Dialog isOpen={show} onClose={onClose} labelledById="upload-title">
      <h2 id="upload-title" className="modal-title">
        Confirm Upload
      </h2>
      <p className="modal-body">
        Are you sure you want to upload the file: <strong>{fileName}?</strong>
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
          {isSubmitting ? "Uploading..." : "Yes, Upload"}
        </button>
      </div>
    </Dialog>
  );
}
