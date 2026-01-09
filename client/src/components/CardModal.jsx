import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBoardStore, LABELS, PRIORITIES } from '../store/boardStore';

function CardModal({ card, columnId, onClose }) {
  const { 
    updateCard, 
    deleteCard, 
    toggleCardLabel, 
    setCardPriority,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    updateChecklistItem,
    archiveCard,
    theme 
  } = useBoardStore();
  
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [editingChecklistItemId, setEditingChecklistItemId] = useState(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('');

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSaveTitle = async () => {
    if (title.trim() && title !== card.title) {
      await updateCard(columnId, card.id, { title: title.trim() });
    } else {
      setTitle(card.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (description !== card.description) {
      await updateCard(columnId, card.id, { description });
    }
    setIsEditingDesc(false);
  };

  const handleDelete = async () => {
    await deleteCard(columnId, card.id);
    onClose();
  };

  const handleArchive = async () => {
    await archiveCard(columnId, card.id);
    onClose();
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (newChecklistItem.trim()) {
      await addChecklistItem(columnId, card.id, newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const handleStartEditChecklistItem = (item) => {
    setEditingChecklistItemId(item.id);
    setEditingChecklistItemText(item.text);
  };

  const handleSaveChecklistItem = async () => {
    if (editingChecklistItemText.trim() && editingChecklistItemId) {
      await updateChecklistItem(columnId, card.id, editingChecklistItemId, editingChecklistItemText.trim());
    }
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
  };

  const handleCancelEditChecklistItem = () => {
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
  };

  // Copy checklist to clipboard
  const handleCopyChecklist = async () => {
    const checklistText = checklist
      .map(item => `${item.completed ? '✓' : '○'} ${item.text}`)
      .join('\n');
    
    const fullText = `${card.title}\n${'─'.repeat(card.title.length)}\n${checklistText}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedChecklist(true);
      setTimeout(() => setCopiedChecklist(false), 2000);
    } catch (err) {
      console.error('Failed to copy checklist:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const checklist = card.checklist || [];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const currentLabels = card.labels || [];
  const currentPriority = card.priority ? PRIORITIES[card.priority] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in
          ${theme === 'dark' ? 'bg-charcoal-800 border border-charcoal-700' : 'bg-white'}
        `}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-4">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitle(card.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className={`
                  flex-1 px-2 py-1 rounded font-mono text-lg font-semibold border
                  ${theme === 'dark' 
                    ? 'bg-charcoal-700 border-charcoal-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'}
                `}
              />
            ) : (
              <h2
                className={`flex-1 font-mono text-lg font-semibold cursor-text hover:text-cyber-cyan transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                onClick={() => setIsEditingTitle(true)}
              >
                {card.title}
              </h2>
            )}

            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {/* Labels Section */}
          <div>
            <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {currentLabels.map(labelKey => {
                const label = LABELS[labelKey];
                if (!label) return null;
                return (
                  <span
                    key={label.name}
                    className={`px-2 py-1 rounded text-xs font-mono font-medium uppercase tracking-wider text-white ${label.color}`}
                  >
                    {label.name}
                  </span>
                );
              })}
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className={`
                  px-3 py-1.5 rounded text-xs font-mono border-2 border-dashed
                  ${theme === 'dark' 
                    ? 'border-charcoal-500 text-gray-300 hover:border-cyber-cyan hover:text-cyber-cyan' 
                    : 'border-gray-300 text-gray-500 hover:border-cyber-cyan hover:text-cyber-cyan'}
                `}
              >
                + Add
              </button>
            </div>
            
            {/* Label Picker */}
            {showLabelPicker && (
              <div className={`mt-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(LABELS).map(([key, label]) => {
                    const isSelected = currentLabels.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleCardLabel(columnId, card.id, key)}
                        className={`
                          px-2 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider text-white
                          ${label.color} ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-charcoal-700' : 'opacity-60 hover:opacity-100'}
                        `}
                      >
                        {isSelected && '✓ '}{label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Priority Section */}
          <div>
            <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {currentPriority ? (
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium ${theme === 'dark' ? 'bg-charcoal-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${currentPriority.color}`} />
                  {currentPriority.name}
                </span>
              ) : null}
              <button
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className={`
                  px-3 py-1.5 rounded text-xs font-mono border-2 border-dashed
                  ${theme === 'dark' 
                    ? 'border-charcoal-500 text-gray-300 hover:border-cyber-cyan hover:text-cyber-cyan' 
                    : 'border-gray-300 text-gray-500 hover:border-cyber-cyan hover:text-cyber-cyan'}
                `}
              >
                {currentPriority ? 'Change' : '+ Set Priority'}
              </button>
            </div>

            {/* Priority Picker */}
            {showPriorityPicker && (
              <div className={`mt-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRIORITIES).map(([key, priority]) => {
                    const isSelected = card.priority === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setCardPriority(columnId, card.id, key);
                          setShowPriorityPicker(false);
                        }}
                        className={`
                          flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium
                          ${theme === 'dark' ? 'bg-charcoal-600 hover:bg-charcoal-500 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}
                          ${isSelected ? 'ring-2 ring-cyber-cyan' : ''}
                        `}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${priority.color}`} />
                        {priority.name}
                      </button>
                    );
                  })}
                  {card.priority && (
                    <button
                      onClick={() => {
                        setCardPriority(columnId, card.id, null);
                        setShowPriorityPicker(false);
                      }}
                      className={`
                        px-3 py-1.5 rounded text-xs font-mono text-red-400
                        ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-50'}
                      `}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Description
            </label>
            {isEditingDesc ? (
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  autoFocus
                  className={`
                    w-full px-3 py-2 rounded-lg font-mono text-sm resize-none
                    ${theme === 'dark'
                      ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
                    border focus:border-cyber-cyan
                  `}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1.5 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescription(card.description || '');
                      setIsEditingDesc(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-sm ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className={`
                  px-3 py-2 rounded-lg font-mono text-sm cursor-text min-h-[60px]
                  ${theme === 'dark'
                    ? 'bg-charcoal-600/50 hover:bg-charcoal-600'
                    : 'bg-gray-50 hover:bg-gray-100'}
                  ${description 
                    ? theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}
                `}
              >
                {description || 'Click to add a description...'}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Checklist {totalCount > 0 && `(${completedCount}/${totalCount})`}
              </label>
              {totalCount > 0 && (
                <button
                  onClick={handleCopyChecklist}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors
                    ${copiedChecklist 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : theme === 'dark' 
                        ? 'text-gray-400 hover:bg-charcoal-700 hover:text-white' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
                  `}
                  title="Copy checklist to clipboard"
                >
                  {copiedChecklist ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className={`h-2 rounded-full overflow-hidden mb-3 ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full transition-all duration-300 ${completedCount === totalCount ? 'bg-emerald-500' : 'bg-cyber-cyan'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2">
              {checklist.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg group ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-50'}`}
                >
                  <button
                    onClick={() => toggleChecklistItem(columnId, card.id, item.id)}
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${item.completed
                        ? 'bg-cyber-cyan border-cyber-cyan text-charcoal-900'
                        : theme === 'dark' ? 'border-charcoal-500 hover:border-cyber-cyan' : 'border-gray-300 hover:border-cyber-cyan'}
                    `}
                  >
                    {item.completed && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {editingChecklistItemId === item.id ? (
                    <input
                      type="text"
                      value={editingChecklistItemText}
                      onChange={(e) => setEditingChecklistItemText(e.target.value)}
                      onBlur={handleSaveChecklistItem}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveChecklistItem();
                        if (e.key === 'Escape') handleCancelEditChecklistItem();
                      }}
                      autoFocus
                      className={`
                        flex-1 px-2 py-1 rounded font-mono text-sm border
                        ${theme === 'dark'
                          ? 'bg-charcoal-600 border-charcoal-500 text-white'
                          : 'bg-white border-gray-300 text-gray-900'}
                        focus:border-cyber-cyan
                      `}
                    />
                  ) : (
                    <span 
                      onClick={() => handleStartEditChecklistItem(item)}
                      className={`flex-1 font-mono text-sm cursor-text hover:text-cyber-cyan transition-colors ${item.completed ? 'line-through text-gray-500' : theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
                    >
                      {item.text}
                    </span>
                  )}
                  <button
                    onClick={() => deleteChecklistItem(columnId, card.id, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add Checklist Item */}
            <form onSubmit={handleAddChecklistItem} className="mt-2 flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add an item..."
                className={`
                  flex-1 px-3 py-2 rounded-lg font-mono text-sm
                  ${theme === 'dark'
                    ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
                  border focus:border-cyber-cyan
                `}
              />
              <button
                type="submit"
                disabled={!newChecklistItem.trim()}
                className="px-3 py-2 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
          </div>

          {/* Created Date */}
          <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Created {formatDate(card.createdAt)}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
          <button
            onClick={handleArchive}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm
              transition-colors
              ${theme === 'dark' ? 'text-gray-400 hover:bg-charcoal-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive
          </button>
          
          <button
            onClick={handleDelete}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm
              text-red-400 transition-colors
              ${theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CardModal;
