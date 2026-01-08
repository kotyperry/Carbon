import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/boardStore';
import Card from './Card';

function Column({ column, isDragging }) {
  const { updateColumn, deleteColumn, addCard, theme } = useBoardStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveTitle = async () => {
    if (title.trim() && title !== column.title) {
      await updateColumn(column.id, { title: title.trim() });
    } else {
      setTitle(column.title);
    }
    setIsEditing(false);
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      await addCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleDeleteColumn = async () => {
    await deleteColumn(column.id);
    setShowMenu(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        w-full
        flex flex-col rounded-xl glass
        min-h-[120px]
        ${isDragging ? 'opacity-50' : ''}
        ${theme === 'dark' ? '' : 'bg-white/70'}
      `}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className={`
          px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing
          border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
        `}
      >
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setTitle(column.title);
                setIsEditing(false);
              }
            }}
            autoFocus
            className={`
              flex-1 px-2 py-0.5 rounded font-mono text-sm font-semibold bg-transparent border
              ${theme === 'dark' ? 'border-charcoal-600' : 'border-gray-300'}
            `}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className="font-mono font-semibold text-sm flex items-center gap-2 cursor-text"
            onClick={() => setIsEditing(true)}
          >
            {column.title}
            <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-charcoal-600 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
              {column.cards.length}
            </span>
          </h3>
        )}

        {/* Column Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className={`
                absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-20 py-1
                ${theme === 'dark' ? 'bg-charcoal-700 border border-charcoal-600' : 'bg-white border border-gray-200'}
              `}>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm font-mono flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Rename
                </button>
                <button
                  onClick={handleDeleteColumn}
                  className={`w-full px-3 py-2 text-left text-sm font-mono flex items-center gap-2 text-red-400 ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[300px] sm:max-h-[400px] lg:max-h-none">
        <SortableContext
          items={column.cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <Card key={card.id} card={card} columnId={column.id} />
          ))}
        </SortableContext>

        {/* Add Card Form */}
        {isAddingCard ? (
          <form onSubmit={handleAddCard} className="animate-fade-in">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              autoFocus
              rows={2}
              className={`
                w-full px-3 py-2 rounded-lg font-mono text-sm resize-none
                ${theme === 'dark'
                  ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}
                border focus:border-cyber-cyan
              `}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard(e);
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 px-3 py-1.5 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim"
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className={`px-3 py-1.5 rounded-lg font-mono text-sm ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-200'}`}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className={`
              w-full p-2 rounded-lg text-left font-mono text-sm
              flex items-center gap-2 transition-colors
              ${theme === 'dark'
                ? 'text-gray-500 hover:bg-charcoal-700 hover:text-gray-300'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

export default Column;
