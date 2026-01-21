import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { open } from "@tauri-apps/plugin-shell";
import { useBoardStore } from "../store/boardStore";
import EditFolderModal from "./EditFolderModal";

function BookmarkFolderCard({ folder, isDropTarget, isDragOverlay, onClick }) {
  const {
    theme,
    getBookmarksInFolder,
    deleteBookmarkFolder,
    setActiveBookmarkFolder,
  } = useBoardStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const bookmarksInFolder = getBookmarksInFolder(folder.id);
  const totalCount = bookmarksInFolder.length;
  const previewBookmarks = bookmarksInFolder.slice(0, 5); // Show up to 5 bookmarks in preview

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: {
      type: "folder",
      folder,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get favicon URL
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const handleClick = (e) => {
    // Don't navigate if clicking buttons
    if (e.target.closest("button")) return;
    setActiveBookmarkFolder(folder.id);
    onClick?.(folder);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e) => {
    e?.stopPropagation();
    await deleteBookmarkFolder(folder.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e) => {
    e?.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // If this is the drag overlay, render without sortable wrapper
  if (isDragOverlay) {
    return (
      <div className="drag-overlay">
        <FolderCardContent
          folder={folder}
          previewBookmarks={previewBookmarks}
          totalCount={totalCount}
          theme={theme}
          getFaviconUrl={getFaviconUrl}
          handleEdit={handleEdit}
          handleDeleteClick={handleDeleteClick}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
          showDeleteConfirm={false}
          isDropTarget={false}
        />
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`
          touch-none cursor-pointer
          ${isDragging ? "opacity-50 scale-105 z-50" : ""}
          ${isDropTarget ? "ring-2 ring-cyber-cyan ring-offset-2 ring-offset-charcoal-800 scale-[1.02] transition-all" : ""}
        `}
      >
        <FolderCardContent
          folder={folder}
          previewBookmarks={previewBookmarks}
          totalCount={totalCount}
          theme={theme}
          getFaviconUrl={getFaviconUrl}
          handleEdit={handleEdit}
          handleDeleteClick={handleDeleteClick}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
          showDeleteConfirm={showDeleteConfirm}
          isDropTarget={isDropTarget}
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditFolderModal
          folder={folder}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}

// Separate component for the folder card content
function FolderCardContent({
  folder,
  previewBookmarks,
  totalCount,
  theme,
  getFaviconUrl,
  handleEdit,
  handleDeleteClick,
  handleConfirmDelete,
  handleCancelDelete,
  showDeleteConfirm,
  isDropTarget,
}) {
  // Get the folder color or default to cyber-cyan
  const folderColor = folder.color || "bg-cyber-cyan";

  return (
    <div
      className={`
        group p-4 rounded-xl min-h-[160px]
        transition-all animate-fade-in relative
        hover:scale-[1.02] hover:-translate-y-0.5
        ${
          theme === "dark"
            ? "glass-card shadow-lg shadow-black/30 hover:border-cyber-cyan/30"
            : "bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:border-cyber-cyan/50 hover:shadow-lg"
        }
        ${isDropTarget ? "border-cyber-cyan border-2" : ""}
      `}
    >
      {/* Folder header with icon and name */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center ${folderColor}`}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
          </svg>
        </div>
        <h4
          className={`font-mono text-sm font-medium truncate flex-1 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          {folder.name}
        </h4>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${
            theme === "dark"
              ? "bg-charcoal-600 text-gray-400"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {totalCount}
        </span>
      </div>

      {/* Stacked list of bookmarks with icons and names */}
      <div className="space-y-2 mb-2">
        {previewBookmarks.map((bookmark, index) => {
          const faviconUrl = bookmark?.favicon || getFaviconUrl(bookmark.url);

          const handleBookmarkClick = async (e) => {
            e.stopPropagation();
            try {
              await open(bookmark.url);
            } catch (error) {
              console.error("Failed to open URL:", error);
              window.open(bookmark.url, "_blank", "noopener,noreferrer");
            }
          };

          return (
            <div
              key={bookmark.id}
              onClick={handleBookmarkClick}
              className={`
                group/bookmark relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
                ${
                  theme === "dark"
                    ? "bg-charcoal-700/30 hover:bg-charcoal-700/50"
                    : "bg-gray-50 hover:bg-gray-100"
                }
                transition-colors
              `}
            >
              {/* External link indicator */}
              <div
                className={`
                  absolute right-2 top-1/2 -translate-y-1/2
                  opacity-0 group-hover/bookmark:opacity-100 transition-opacity
                  ${theme === "dark" ? "text-cyber-cyan" : "text-cyber-cyan"}
                `}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>

              {/* Favicon */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <svg
                    className={`w-4 h-4 ${
                      theme === "dark" ? "text-gray-600" : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                )}
              </div>

              {/* Title */}
              <span
                className={`text-xs font-mono truncate pr-6 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {bookmark.title}
              </span>
            </div>
          );
        })}

        {/* Show "and X more" if there are more bookmarks */}
        {totalCount > 5 && (
          <div
            className={`
              flex items-center justify-center py-1 text-xs font-mono
              ${theme === "dark" ? "text-gray-500" : "text-gray-400"}
            `}
          >
            +{totalCount - 5} more
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div
            className={`
              flex items-center justify-center py-4 text-xs font-mono
              ${theme === "dark" ? "text-gray-600" : "text-gray-400"}
            `}
          >
            Empty folder
          </div>
        )}
      </div>

      {/* Hover Actions / Delete Confirmation */}
      <div
        className={`
        pt-2 border-t
        ${!showDeleteConfirm ? "opacity-0 group-hover:opacity-100" : "opacity-100"}
        transition-opacity
        ${theme === "dark" ? "border-charcoal-600" : "border-gray-200"}
      `}
      >
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono flex-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Delete folder?
            </span>
            <button
              onClick={handleCancelDelete}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:bg-charcoal-600"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-2 py-1 rounded text-xs font-mono bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleEdit}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-cyber-cyan hover:bg-charcoal-600"
                  : "text-gray-500 hover:text-cyber-cyan hover:bg-gray-100"
              }`}
              title="Edit folder"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Delete folder"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookmarkFolderCard;
