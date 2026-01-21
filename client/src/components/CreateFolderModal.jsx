import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBoardStore, TAG_COLORS } from "../store/boardStore";

// Folder-specific colors (includes cyber-cyan as default)
const FOLDER_COLORS = ["bg-cyber-cyan", ...TAG_COLORS];

function CreateFolderModal({ bookmarkIds, onClose, onSuccess }) {
  const { theme, bookmarks, createBookmarkFolder } = useBoardStore();

  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("bg-cyber-cyan");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get the two bookmarks being combined
  const selectedBookmarks = bookmarks.filter((b) => bookmarkIds.includes(b.id));

  // Get favicon URL
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

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
      const folder = await createBookmarkFolder(folderName.trim(), bookmarkIds, folderColor);
      onSuccess?.(folder);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create folder");
    } finally {
      setIsLoading(false);
    }
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
            Create Folder
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

        {/* Preview of bookmarks being combined */}
        {selectedBookmarks.length > 0 && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              theme === "dark" ? "bg-charcoal-700/50" : "bg-gray-50"
            }`}
          >
            <p
              className={`text-xs font-mono uppercase tracking-wider mb-2 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Combining {selectedBookmarks.length} bookmarks
            </p>
            <div className="flex items-center gap-3">
              {selectedBookmarks.map((bookmark) => {
                const faviconUrl =
                  bookmark.favicon || getFaviconUrl(bookmark.url);
                return (
                  <div key={bookmark.id} className="flex items-center gap-2">
                    {faviconUrl && (
                      <img
                        src={faviconUrl}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                    <span
                      className={`text-sm font-mono truncate max-w-[100px] ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {bookmark.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`
                flex-1 px-4 py-3 rounded-lg font-mono text-sm font-medium
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
                flex-1 px-4 py-3 rounded-lg font-mono text-sm font-medium
                bg-cyber-cyan text-charcoal-900
                hover:bg-cyber-cyan-dim transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default CreateFolderModal;
