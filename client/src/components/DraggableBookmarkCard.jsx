import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BookmarkCard from "./BookmarkCard";

function DraggableBookmarkCard({ bookmark, onEdit, isDropTarget, isDragOverlay, folderProgress = 0 }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    data: {
      type: "bookmark",
      bookmark,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Show progress indicator when hovering toward folder creation
  const showProgress = folderProgress > 0 && folderProgress < 100;

  // If this is the drag overlay, render without sortable wrapper
  if (isDragOverlay) {
    return (
      <div className="drag-overlay">
        <BookmarkCard bookmark={bookmark} onEdit={onEdit} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        touch-none relative
        ${isDragging ? "opacity-50 scale-105 z-50" : ""}
        ${isDropTarget ? "ring-2 ring-cyber-cyan ring-offset-2 ring-offset-charcoal-800 scale-[1.02] transition-all" : ""}
        ${showProgress ? "ring-2 ring-cyber-cyan/50 ring-offset-2 ring-offset-charcoal-800" : ""}
      `}
    >
      {/* Folder creation progress indicator */}
      {showProgress && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-cyber-cyan/30"
          >
            <div
              className="h-full bg-cyber-cyan transition-all duration-75"
              style={{ width: `${folderProgress}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-charcoal-900/80 px-2 py-1 rounded text-xs font-mono text-cyber-cyan">
              Hold to create folder
            </div>
          </div>
        </div>
      )}
      <BookmarkCard
        bookmark={bookmark}
        onEdit={onEdit}
        isDropTarget={isDropTarget}
      />
    </div>
  );
}

export default DraggableBookmarkCard;
