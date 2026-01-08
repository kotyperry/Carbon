import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useBoardStore, LABELS, PRIORITIES } from '../store/boardStore';
import Column from './Column';
import Card from './Card';

function Board({ onMenuClick }) {
  const { 
    getCurrentBoard, 
    moveCard, 
    moveColumn, 
    addColumn, 
    theme,
    showArchive,
    toggleArchiveView,
    restoreCard,
    deleteArchivedCard
  } = useBoardStore();
  const board = getCurrentBoard();
  
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!board) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile Header - with padding for macOS traffic lights */}
        <header className={`px-4 py-4 pt-10 lg:pt-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
          <button
            onClick={onMenuClick}
            className={`p-2 rounded-lg lg:hidden ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <svg className="w-8 h-8" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#00d4ff'}}/>
                <stop offset="100%" style={{stopColor:'#a855f7'}}/>
              </linearGradient>
            </defs>
            <path d="M20 25 Q35 35, 35 50 Q35 65, 50 75" stroke="url(#headerLogoGrad)" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.4"/>
            <path d="M50 20 Q50 35, 50 50 Q50 65, 50 80" stroke="url(#headerLogoGrad)" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.7"/>
            <path d="M80 25 Q65 35, 65 50 Q65 65, 50 75" stroke="url(#headerLogoGrad)" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.4"/>
            <circle cx="50" cy="50" r="12" fill="url(#headerLogoGrad)"/>
            <circle cx="50" cy="50" r="6" fill="#0f0f0f"/>
          </svg>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className={`text-xl font-mono mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              No board selected
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              Create a new board from the sidebar
            </p>
          </div>
        </div>
      </div>
    );
  }

  const archivedCards = board.archivedCards || [];

  const findColumn = (id) => {
    // Check if id is a column
    const column = board.columns.find(c => c.id === id);
    if (column) return column;

    // Check if id is a card
    for (const col of board.columns) {
      const card = col.cards.find(c => c.id === id);
      if (card) return col;
    }
    return null;
  };

  const findCard = (id) => {
    for (const col of board.columns) {
      const card = col.cards.find(c => c.id === id);
      if (card) return card;
    }
    return null;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Determine if dragging a column or card
    const isColumn = board.columns.some(c => c.id === active.id);
    setActiveType(isColumn ? 'column' : 'card');
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Only handle card dragging here
    if (activeType !== 'card') return;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) return;

    // If moving to a different column
    if (activeColumn.id !== overColumn.id) {
      const activeCardIndex = activeColumn.cards.findIndex(c => c.id === activeId);
      
      // Determine the index in the destination column
      let overIndex;
      const overCard = overColumn.cards.find(c => c.id === overId);
      
      if (overCard) {
        overIndex = overColumn.cards.findIndex(c => c.id === overId);
      } else {
        // Dropping on the column itself (empty area)
        overIndex = overColumn.cards.length;
      }

      moveCard(activeId, activeColumn.id, overColumn.id, overIndex);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (activeType === 'column') {
      // Handle column reordering
      const oldIndex = board.columns.findIndex(c => c.id === activeId);
      const newIndex = board.columns.findIndex(c => c.id === overId);
      
      if (oldIndex !== newIndex) {
        moveColumn(activeId, newIndex);
      }
    } else {
      // Handle card reordering within the same column
      const activeColumn = findColumn(activeId);
      const overColumn = findColumn(overId);

      if (activeColumn && overColumn && activeColumn.id === overColumn.id) {
        const oldIndex = activeColumn.cards.findIndex(c => c.id === activeId);
        const newIndex = activeColumn.cards.findIndex(c => c.id === overId);
        
        if (oldIndex !== newIndex && newIndex !== -1) {
          moveCard(activeId, activeColumn.id, activeColumn.id, newIndex);
        }
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (newColumnTitle.trim()) {
      await addColumn(newColumnTitle.trim());
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  const activeCard = activeType === 'card' ? findCard(activeId) : null;
  const activeColumnData = activeType === 'column' ? board.columns.find(c => c.id === activeId) : null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Board Header - with padding for macOS traffic lights when sidebar hidden */}
      <header className={`px-4 sm:px-6 py-4 pt-10 lg:pt-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className={`p-2 rounded-lg lg:hidden ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}`}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-mono font-bold truncate">{board.name}</h2>
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {board.columns.length} columns · {board.columns.reduce((acc, col) => acc + col.cards.length, 0)} cards
            {archivedCards.length > 0 && ` · ${archivedCards.length} archived`}
          </p>
        </div>

        {/* Archive Toggle */}
        {archivedCards.length > 0 && (
          <button
            onClick={toggleArchiveView}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm transition-colors
              ${showArchive 
                ? 'bg-cyber-cyan text-charcoal-900' 
                : theme === 'dark' 
                  ? 'text-gray-400 hover:bg-charcoal-700 hover:text-white' 
                  : 'text-gray-500 hover:bg-gray-100'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="hidden sm:inline">Archive</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${showArchive ? 'bg-charcoal-900/20' : theme === 'dark' ? 'bg-charcoal-600' : 'bg-gray-200'}`}>
              {archivedCards.length}
            </span>
          </button>
        )}
      </header>

      {/* Archive View */}
      {showArchive ? (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-semibold">Archived Cards</h3>
              <button
                onClick={toggleArchiveView}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {archivedCards.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <p className="font-mono">No archived cards</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archivedCards.map(card => {
                  const labels = (card.labels || []).map(key => LABELS[key]).filter(Boolean);
                  const priority = card.priority ? PRIORITIES[card.priority] : null;
                  const checklist = card.checklist || [];
                  const completedCount = checklist.filter(item => item.completed).length;
                  const totalCount = checklist.length;

                  return (
                    <div
                      key={card.id}
                      className={`
                        p-4 rounded-xl
                        ${priority ? `border-l-4 ${priority.borderColor}` : ''}
                        ${theme === 'dark' 
                          ? 'bg-charcoal-700/50 border border-charcoal-600' 
                          : 'bg-white border border-gray-200 shadow-sm'}
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

                      <h4 className="font-mono text-sm font-medium mb-1">{card.title}</h4>
                      
                      {card.description && (
                        <p className={`text-xs line-clamp-2 mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {card.description}
                        </p>
                      )}

                      {/* Checklist Progress */}
                      {totalCount > 0 && (
                        <div className={`flex items-center gap-1 mb-2 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="font-mono">{completedCount}/{totalCount}</span>
                        </div>
                      )}

                      <div className={`flex items-center gap-2 text-xs mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archived {formatDate(card.archivedAt)}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreCard(card.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-mono text-xs bg-cyber-cyan text-charcoal-900 hover:bg-cyber-cyan-dim"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Restore
                        </button>
                        <button
                          onClick={() => deleteArchivedCard(card.id)}
                          className={`px-2 py-1.5 rounded-lg font-mono text-xs text-red-400 ${theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Columns Container */
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* 
              Responsive grid layout:
              - Mobile (< 640px): Single column, stacked vertically
              - Tablet (640px - 1024px): 2 columns
              - Desktop (> 1024px): 3 columns
              - Extra large (> 1280px): 4 columns
              Columns wrap and stack instead of horizontal scrolling
            */}
            <div className="
              grid gap-4
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
              pb-4
              items-start
            ">
              <SortableContext
                items={board.columns.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                {board.columns.map((column) => (
                  <Column key={column.id} column={column} />
                ))}
              </SortableContext>

              {/* Add Column Button */}
              {isAddingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className={`
                    w-full p-3 rounded-xl glass
                    ${theme === 'dark' ? '' : 'bg-white/50'}
                  `}
                >
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Column title..."
                    autoFocus
                    className={`
                      w-full px-3 py-2 rounded-lg font-mono text-sm
                      ${theme === 'dark'
                        ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}
                      border focus:border-cyber-cyan
                    `}
                    onBlur={() => {
                      if (!newColumnTitle.trim()) setIsAddingColumn(false);
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingColumn(false)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-sm ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className={`
                    w-full p-4 rounded-xl border-2 border-dashed
                    flex items-center justify-center gap-2 font-mono text-sm
                    transition-colors min-h-[60px]
                    ${theme === 'dark'
                      ? 'border-charcoal-600 text-gray-500 hover:border-cyber-cyan hover:text-cyber-cyan'
                      : 'border-gray-300 text-gray-400 hover:border-cyber-cyan hover:text-cyber-cyan'}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Column
                </button>
              )}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard && (
                <div className="drag-overlay">
                  <Card card={activeCard} columnId="" isDragging />
                </div>
              )}
              {activeColumnData && (
                <div className="drag-overlay opacity-80">
                  <Column column={activeColumnData} isDragging />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}

export default Board;
