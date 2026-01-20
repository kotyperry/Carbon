import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BookmarkCard from "./BookmarkCard";

function DraggableBookmarkCard({ bookmark, onEdit, isDropTarget, isDragOverlay }) {
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
        touch-none
        ${isDragging ? "opacity-50 scale-105 z-50" : ""}
        ${isDropTarget ? "ring-2 ring-cyber-cyan ring-offset-2 ring-offset-charcoal-800 scale-[1.02] transition-all" : ""}
      `}
    >
      <BookmarkCard
        bookmark={bookmark}
        onEdit={onEdit}
        isDropTarget={isDropTarget}
      />
    </div>
  );
}

export default DraggableBookmarkCard;
