import { useState } from "react";
import { useBoardStore } from "../store/boardStore";
import BookmarkCard from "./BookmarkCard";
import AddBookmarkModal from "./AddBookmarkModal";

function BookmarksView({ onMenuClick }) {
  const {
    theme,
    getFilteredBookmarks,
    getAllTags,
    activeCollection,
    activeTag,
    setActiveTag,
    collections,
    getBookmarkTags,
  } = useBoardStore();

  const BOOKMARK_TAGS = getBookmarkTags();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);

  const bookmarks = getFilteredBookmarks();
  const allTags = getAllTags();

  // Get current collection name
  const currentCollection = collections.find((c) => c.id === activeCollection);
  const currentTagData = activeTag ? BOOKMARK_TAGS[activeTag] : null;

  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingBookmark(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - with padding for macOS traffic lights when sidebar hidden */}
      <header
        className={`px-4 sm:px-6 py-4 pt-10 lg:pt-4 border-b flex items-center gap-4 ${
          theme === "dark" ? "border-charcoal-700" : "border-gray-200"
        }`}
      >
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className={`p-2 rounded-lg lg:hidden ${
            theme === "dark" ? "hover:bg-charcoal-700" : "hover:bg-gray-100"
          }`}
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-mono font-bold truncate flex items-center gap-2">
            {activeTag && currentTagData ? (
              <>
                <span
                  className={`w-3 h-3 rounded-full ${currentTagData.color}`}
                />
                {currentTagData.name}
              </>
            ) : (
              currentCollection?.name || "Bookmarks"
            )}
          </h2>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Tags Filter (horizontal scroll) - only show if there are tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <span
              className={`text-xs font-mono uppercase tracking-wider shrink-0 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Tags:
            </span>
            {allTags.map((tagKey) => {
              const tag = BOOKMARK_TAGS[tagKey];
              if (!tag) return null;
              const isActive = activeTag === tagKey;
              return (
                <button
                  key={tagKey}
                  onClick={() => setActiveTag(isActive ? null : tagKey)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all
                    ${
                      isActive
                        ? `${tag.color} text-white`
                        : theme === "dark"
                        ? "bg-charcoal-700 text-gray-400 hover:bg-charcoal-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Bookmarks Grid */}
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
                theme === "dark" ? "bg-charcoal-700" : "bg-gray-100"
              }`}
            >
              <svg
                className={`w-8 h-8 ${
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
            </div>
            <h3
              className={`text-lg font-mono mb-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No bookmarks yet
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Add your first bookmark to get started
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim transition-colors"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Bookmark
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={handleEditBookmark}
              />
            ))}

            {/* Add Bookmark Button - matches kanban "Add Card" style */}
            <button
              onClick={() => setShowAddModal(true)}
              className={`
                p-4 rounded-xl border-2 border-dashed min-h-[120px]
                flex flex-col items-center justify-center gap-2 font-mono text-sm
                transition-colors
                ${
                  theme === "dark"
                    ? "border-charcoal-600 text-gray-500 hover:border-cyber-cyan hover:text-cyber-cyan"
                    : "border-gray-300 text-gray-400 hover:border-cyber-cyan hover:text-cyber-cyan"
                }
              `}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Bookmark
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddBookmarkModal
          bookmark={editingBookmark}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default BookmarksView;
