import React, { useState } from 'react';
import Dialog from '../ui/Dialog';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledById="delete-title">
      <h2 id="delete-title" className="modal-title">{title}</h2>
      <p className="modal-body">{message}</p>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={isDeleting}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-danger-solid"
          disabled={isDeleting}
          onClick={handleConfirm}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
