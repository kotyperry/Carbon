import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBoardStore, TAG_COLORS } from "../store/boardStore";

// Folder-specific colors (includes cyber-cyan as default)
const FOLDER_COLORS = ["bg-cyber-cyan", ...TAG_COLORS];

function EditFolderModal({ folder, onClose }) {
  const { theme, updateBookmarkFolder, deleteBookmarkFolder } = useBoardStore();

  const [folderName, setFolderName] = useState(folder?.name || "");
  const [folderColor, setFolderColor] = useState(folder?.color || "bg-cyber-cyan");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    setIsLoading(true);
    try {
      await updateBookmarkFolder(folder.id, {
        name: folderName.trim(),
        color: folderColor,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update folder");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    await deleteBookmarkFolder(folder.id);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`
          relative w-full max-w-md rounded-2xl p-6 shadow-2xl
          animate-fade-in
          ${theme === "dark" ? "glass-modal" : "bg-white"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className={`text-xl font-mono font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Edit Folder
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === "dark"
                ? "hover:bg-charcoal-700 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Folder Name */}
          <div className="mb-4">
            <label
              className={`block text-sm font-mono mb-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="My Folder"
              autoFocus
              className={`
                w-full px-4 py-3 rounded-lg font-mono text-sm
                ${
                  theme === "dark"
                    ? "bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                }
                border focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan
                transition-colors
              `}
            />
          </div>

          {/* Folder Color */}
          <div className="mb-6">
            <label
              className={`block text-sm font-mono mb-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Folder Color
            </label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFolderColor(color)}
                  className={`
                    w-8 h-8 rounded-lg transition-all
                    ${color}
                    ${
                      folderColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-charcoal-800 scale-110"
                        : "hover:scale-105"
                    }
                  `}
                  title={color.replace("bg-", "").replace("-500", "")}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-mono text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          {showDeleteConfirm ? (
            <div
              className={`p-3 rounded-lg mb-4 ${
                theme === "dark" ? "bg-red-500/10" : "bg-red-50"
              }`}
            >
              <p
                className={`text-sm font-mono mb-3 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Delete "{folder.name}"? Bookmarks will be moved to root.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className={`
                    px-3 py-2 rounded-lg font-mono text-sm font-medium
                    transition-colors
                    ${
                      theme === "dark"
                        ? "bg-charcoal-700 text-gray-300 hover:bg-charcoal-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  `}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-2 rounded-lg font-mono text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete Folder
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-4 py-3 rounded-lg font-mono text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className={`
                  px-4 py-3 rounded-lg font-mono text-sm font-medium
                  transition-colors
                  ${
                    theme === "dark"
                      ? "bg-charcoal-700 text-gray-300 hover:bg-charcoal-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`
                  px-4 py-3 rounded-lg font-mono text-sm font-medium
                  bg-cyber-cyan text-charcoal-900
                  hover:bg-cyber-cyan-dim transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default EditFolderModal;
