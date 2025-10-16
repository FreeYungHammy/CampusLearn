import React, { useState, useRef, useEffect } from "react";
import DeleteConfirmationModal from "./DeletePostConfirmationModal";
import {
  isWithinEditWindow,
  getRemainingEditTime,
} from "../../utils/editWindow";

interface PostActionsProps {
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isReply?: boolean;
  createdAt?: string | Date;
}

const PostActions: React.FC<PostActionsProps> = ({
  onEdit,
  onDelete,
  isReply = false,
  createdAt,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if within edit window and calculate remaining time
  const canEdit = createdAt ? isWithinEditWindow(createdAt) : true;
  const remainingEditTime = createdAt ? getRemainingEditTime(createdAt) : null;

  // Update remaining time every minute
  useEffect(() => {
    if (!createdAt || !canEdit) return;

    const updateRemainingTime = () => {
      const time = getRemainingEditTime(createdAt);
      setRemainingTime(time);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [createdAt, canEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDeleteClick = () => {
    setIsOpen(false);
    setIsDeleteModalOpen(true);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="focus:outline-none p-1 rounded-full hover:bg-gray-200"
          aria-label="Post options"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
            <div className="py-1">
              <button
                onClick={() => {
                  onEdit();
                  setIsOpen(false);
                }}
                disabled={!canEdit}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  canEdit
                    ? "text-gray-800 hover:bg-gray-100"
                    : "text-gray-400 cursor-not-allowed"
                }`}
                title={
                  canEdit
                    ? remainingTime && remainingTime > 0
                      ? `Edit available for ${remainingTime} more minute${remainingTime !== 1 ? "s" : ""}`
                      : "Edit my post"
                    : "Edit window expired (10 minutes)"
                }
              >
                {canEdit ? (
                  <>
                    Edit my post
                    {remainingTime && remainingTime > 0 && (
                      <span className="block text-xs text-gray-500">
                        {remainingTime} min left
                      </span>
                    )}
                  </>
                ) : (
                  "Edit expired (10 min)"
                )}
              </button>
              <button
                onClick={handleDeleteClick}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete my post
              </button>
            </div>
          </div>
        )}
      </div>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDelete}
        title={`Delete ${isReply ? "Reply" : "Post"}`}
        message={`Are you sure you want to permanently delete this ${isReply ? "reply" : "post"}? This action cannot be undone.`}
      />
    </>
  );
};

export default PostActions;
