import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore, LABELS, PRIORITIES } from '../store/boardStore';
import CardModal from './CardModal';
import CardContextMenu from './CardContextMenu';

function Card({ card, columnId, isDragging: isDraggingOverlay }) {
  const { theme, toggleChecklistItem, addChecklistItem } = useBoardStore();
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y } or null
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate checklist progress
  const checklist = card.checklist || [];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Get priority info
  const priority = card.priority ? PRIORITIES[card.priority] : null;

  // Get labels
  const labels = (card.labels || []).map(key => LABELS[key]).filter(Boolean);

  // Handle checklist item toggle without opening modal
  const handleChecklistToggle = (e, itemId) => {
    e.stopPropagation();
    toggleChecklistItem(columnId, card.id, itemId);
  };

  const handleStartAddChecklistItem = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddingChecklistItem(true);
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = newChecklistItem.trim();
    if (!text) return;
    await addChecklistItem(columnId, card.id, text);
    setNewChecklistItem('');
    setIsAddingChecklistItem(true);
  };

  const handleCancelAddChecklistItem = (e) => {
    e?.stopPropagation?.();
    setIsAddingChecklistItem(false);
    setNewChecklistItem('');
  };

  // Handle card click (opens modal)
  const handleCardClick = (e) => {
    if (!isDragging) {
      setShowModal(true);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        className={`
          p-3 rounded-xl cursor-grab active:cursor-grabbing
          transition-all animate-fade-in
          ${priority ? `border-l-4 ${priority.borderColor}` : ''}
          ${isDragging || isDraggingOverlay ? 'opacity-50 scale-105' : ''}
          ${theme === 'dark'
            ? 'glass-card shadow-lg shadow-black/30'
            : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}
        `}
      >
        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.map(label => (
              <span
                key={label.name}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider text-white ${label.color}`}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title and Priority */}
        <div className="flex items-start justify-between gap-2">
          <h4 className={`font-mono text-sm font-medium flex-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {card.title}
          </h4>
          {priority && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priority.color}`} title={priority.name} />
          )}
        </div>
        
        {card.description && (
          <p className={`text-xs line-clamp-2 mt-1 mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            {card.description}
          </p>
        )}

        {/* Inline Checklist Items */}
        {totalCount > 0 && (
          <div className="mt-2 mb-2 space-y-1">
            {/* Progress Bar */}
            <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full transition-all duration-300 ${completedCount === totalCount ? 'bg-emerald-500' : 'bg-cyber-cyan'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* Checklist Items - show all items */}
            <div className="space-y-0.5 pt-1">
              {checklist.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 py-0.5 group`}
                  onClick={(e) => handleChecklistToggle(e, item.id)}
                >
                  <button
                    type="button"
                    className={`
                      w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                      ${item.completed
                        ? 'bg-cyber-cyan border-cyber-cyan'
                        : theme === 'dark' 
                          ? 'border-gray-500 hover:border-cyber-cyan group-hover:border-cyber-cyan' 
                          : 'border-gray-300 hover:border-cyber-cyan group-hover:border-cyber-cyan'}
                    `}
                  >
                    {item.completed && (
                      <svg className="w-2.5 h-2.5 text-charcoal-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`
                    text-[11px] font-mono truncate flex-1
                    ${item.completed 
                      ? 'line-through text-gray-500' 
                      : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                  `}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Checklist Item (inline, without opening modal) */}
        {totalCount === 0 && !isAddingChecklistItem && (
          <button
            type="button"
            onClick={handleStartAddChecklistItem}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`
              mt-2 text-left text-[11px] font-mono transition-colors
              ${theme === 'dark' ? 'text-gray-400 hover:text-cyber-cyan' : 'text-gray-500 hover:text-cyber-cyan'}
            `}
          >
            + Add checklist item
          </button>
        )}

        {(totalCount > 0 || isAddingChecklistItem) && (
          <form
            onSubmit={handleAddChecklistItem}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="mt-1 flex items-center gap-2"
          >
            <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              +
            </span>
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelAddChecklistItem(e);
              }}
              placeholder="Add item…"
              className={`
                flex-1 min-w-0 bg-transparent text-[11px] font-mono rounded px-1 py-0.5 outline-none
                ${theme === 'dark'
                  ? 'text-gray-200 placeholder:text-gray-600 focus:ring-1 focus:ring-cyber-cyan/40'
                  : 'text-gray-700 placeholder:text-gray-400 focus:ring-1 focus:ring-cyber-cyan/30'}
              `}
            />
            <button
              type="submit"
              disabled={!newChecklistItem.trim()}
              className={`
                text-[11px] font-mono px-2 py-0.5 rounded transition-colors
                ${newChecklistItem.trim()
                  ? 'bg-cyber-cyan/20 text-cyber-cyan hover:bg-cyber-cyan/30'
                  : theme === 'dark'
                    ? 'bg-charcoal-700 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
              `}
              title="Add checklist item"
            >
              Add
            </button>
          </form>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-between text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(card.createdAt)}
          </div>
          {totalCount > 0 && (
            <div className={`flex items-center gap-1 font-mono ${completedCount === totalCount ? 'text-emerald-400' : ''}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {completedCount}/{totalCount}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CardModal
          card={card}
          columnId={columnId}
          onClose={() => setShowModal(false)}
        />
      )}

      {contextMenu && (
        <CardContextMenu
          card={card}
          columnId={columnId}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export default Card;
