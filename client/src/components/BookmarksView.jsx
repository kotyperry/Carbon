import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useBoardStore } from "../store/boardStore";
import DraggableBookmarkCard from "./DraggableBookmarkCard";
import BookmarkFolderCard from "./BookmarkFolderCard";
import AddBookmarkModal from "./AddBookmarkModal";
import CreateFolderModal from "./CreateFolderModal";

// Delay before folder creation mode activates (like iPhone)
const FOLDER_HOVER_DELAY = 500; // ms

function BookmarksView({ onMenuClick }) {
  const {
    theme,
    bookmarks,
    getFilteredBookmarks,
    getBookmarkFoldersForCollection,
    getAllTags,
    activeCollection,
    activeBookmarkFolder,
    setActiveBookmarkFolder,
    activeTag,
    setActiveTag,
    collections,
    getBookmarkTags,
    reorderBookmarks,
    moveBookmarkToFolder,
    bookmarkFolders,
  } = useBoardStore();

  const BOOKMARK_TAGS = getBookmarkTags();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);

  // Drag state
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [dropType, setDropType] = useState(null); // 'reorder' | 'folder'

  // Hover timer for folder creation
  const hoverTimerRef = useRef(null);
  const lastOverIdRef = useRef(null);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderBookmarkIds, setFolderBookmarkIds] = useState([]);

  const filteredBookmarks = getFilteredBookmarks();
  const folders = getBookmarkFoldersForCollection();
  const allTags = getAllTags();

  // Get current collection name
  const currentCollection = collections.find((c) => c.id === activeCollection);
  const currentTagData = activeTag ? BOOKMARK_TAGS[activeTag] : null;
  const currentFolder = bookmarkFolders.find((f) => f.id === activeBookmarkFolder);

  // Configure sensors (same as kanban)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  // Get all sortable item IDs
  const sortableIds = useMemo(() => {
    const folderIds = activeBookmarkFolder ? [] : folders.map((f) => f.id);
    const bookmarkIds = filteredBookmarks.map((b) => b.id);
    return [...folderIds, ...bookmarkIds];
  }, [folders, filteredBookmarks, activeBookmarkFolder]);

  // Get the active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;

    const bookmark = bookmarks.find((b) => b.id === activeId);
    if (bookmark) return { type: "bookmark", data: bookmark };

    const folder = bookmarkFolders.find((f) => f.id === activeId);
    if (folder) return { type: "folder", data: folder };

    return null;
  }, [activeId, bookmarks, bookmarkFolders]);

  // Clear hover timer on cleanup
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    setDropType(null);
    setOverId(null);
    lastOverIdRef.current = null;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleDragOver = useCallback((event) => {
    const { over, active } = event;

    if (!over) {
      setOverId(null);
      setDropType(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      lastOverIdRef.current = null;
      return;
    }

    const currentOverId = over.id;
    setOverId(currentOverId);

    // Check if we're over a folder (always folder mode)
    const isOverFolder = bookmarkFolders.some((f) => f.id === currentOverId);
    if (isOverFolder) {
      setDropType("folder");
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      return;
    }

    // Check if we're over a different bookmark (not self)
    const isOverBookmark = bookmarks.some((b) => b.id === currentOverId);
    const isSameAsActive = active.id === currentOverId;

    if (isOverBookmark && !isSameAsActive) {
      // If we just moved to a new target, start the hover timer
      if (lastOverIdRef.current !== currentOverId) {
        lastOverIdRef.current = currentOverId;
        setDropType("reorder"); // Start as reorder

        // Clear any existing timer
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }

        // Start new timer for folder mode
        hoverTimerRef.current = setTimeout(() => {
          setDropType("folder");
          hoverTimerRef.current = null;
        }, FOLDER_HOVER_DELAY);
      }
    } else {
      // Over something else or self
      setDropType("reorder");
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      lastOverIdRef.current = currentOverId;
    }
  }, [bookmarkFolders, bookmarks]);

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      // Clear timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      if (!over || active.id === over.id) {
        resetDragState();
        return;
      }

      const isOverFolder = bookmarkFolders.some((f) => f.id === over.id);
      const isActiveBookmark = bookmarks.some((b) => b.id === active.id);
      const isOverBookmark = bookmarks.some((b) => b.id === over.id);

      // Use the current dropType state to determine action
      if (dropType === "folder" && isActiveBookmark) {
        if (isOverFolder) {
          // Move bookmark into existing folder
          await moveBookmarkToFolder(active.id, over.id);
        } else if (isOverBookmark) {
          // Only allow folder creation at root level (not inside a folder)
          // Subfolders are not supported
          if (activeBookmarkFolder) {
            // Inside a folder - just reorder instead
            await reorderBookmarks(active.id, over.id);
          } else {
            // At root level - create new folder with these two bookmarks
            setFolderBookmarkIds([active.id, over.id]);
            setShowFolderModal(true);
          }
        }
      } else {
        // Reorder bookmarks
        await reorderBookmarks(active.id, over.id);
      }

      resetDragState();
    },
    [dropType, bookmarkFolders, bookmarks, activeBookmarkFolder, moveBookmarkToFolder, reorderBookmarks]
  );

  const handleDragCancel = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    resetDragState();
  }, []);

  const resetDragState = () => {
    setActiveId(null);
    setOverId(null);
    setDropType(null);
    lastOverIdRef.current = null;
  };

  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingBookmark(null);
  };

  const handleCloseFolderModal = () => {
    setShowFolderModal(false);
    setFolderBookmarkIds([]);
  };

  const handleBackToRoot = () => {
    setActiveBookmarkFolder(null);
  };

  // Determine if we're in a special collection that shouldn't show folders
  const showFolders = !activeBookmarkFolder && activeCollection !== "favorites" && activeCollection !== "archive";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
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
          {/* Breadcrumb navigation */}
          {activeBookmarkFolder ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToRoot}
                className={`text-xl sm:text-2xl font-mono font-bold hover:text-cyber-cyan transition-colors ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {currentCollection?.name || "All Bookmarks"}
              </button>
              <svg
                className={`w-5 h-5 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <h2 className="text-xl sm:text-2xl font-mono font-bold truncate flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-cyber-cyan"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                </svg>
                {currentFolder?.name || "Folder"}
              </h2>
            </div>
          ) : (
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
          )}
          <p
            className={`text-xs sm:text-sm mt-1 ${
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? "s" : ""}
            {showFolders && folders.length > 0 && ` · ${folders.length} folder${folders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Tags Filter */}
        {allTags.length > 0 && !activeBookmarkFolder && (
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

        {/* Bookmarks Grid with Drag and Drop */}
        {filteredBookmarks.length === 0 && folders.length === 0 ? (
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
              {activeBookmarkFolder ? "This folder is empty" : "No bookmarks yet"}
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {activeBookmarkFolder
                ? "Drag bookmarks here to add them to this folder"
                : "Add your first bookmark to get started"}
            </p>
            {!activeBookmarkFolder && (
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
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Render folders first (only at root level) */}
                {showFolders &&
                  folders.map((folder) => (
                    <BookmarkFolderCard
                      key={folder.id}
                      folder={folder}
                      isDropTarget={overId === folder.id && dropType === "folder"}
                    />
                  ))}

                {/* Render bookmarks */}
                {filteredBookmarks.map((bookmark) => (
                  <DraggableBookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={handleEditBookmark}
                    isDropTarget={overId === bookmark.id && dropType === "folder"}
                  />
                ))}

                {/* Add Bookmark Button */}
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
            </SortableContext>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeItem?.type === "bookmark" && (
                <DraggableBookmarkCard
                  bookmark={activeItem.data}
                  isDragOverlay
                />
              )}
              {activeItem?.type === "folder" && (
                <BookmarkFolderCard
                  folder={activeItem.data}
                  isDragOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddBookmarkModal
          bookmark={editingBookmark}
          onClose={handleCloseModal}
        />
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <CreateFolderModal
          bookmarkIds={folderBookmarkIds}
          onClose={handleCloseFolderModal}
        />
      )}
    </div>
  );
}

export default BookmarksView;
