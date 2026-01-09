import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBoardStore } from '../store/boardStore';

function CardContextMenu({ card, columnId, position, onClose }) {
  const { theme, clearCompletedChecklistItems } = useBoardStore();
  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);
  const menuRef = useRef(null);

  const checklist = card.checklist || [];
  const completedCount = checklist.filter(item => item.completed).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 8}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 8}px`;
      }
    }
  }, [position]);

  const handleCopyChecklist = async () => {
    if (checklist.length === 0) return;

    const checklistText = checklist
      .map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(checklistText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to copy checklist:', err);
    }
  };

  const menuStyle = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className={`
        min-w-[180px] rounded-xl shadow-2xl overflow-hidden
        ${theme === 'dark' 
          ? 'bg-charcoal-800 border border-charcoal-600' 
          : 'bg-white border border-gray-200'}
        animate-in fade-in zoom-in-95 duration-150
      `}
    >
      {/* Card Title Header */}
      <div className={`px-3 py-2.5 border-b ${theme === 'dark' ? 'border-charcoal-700 bg-charcoal-700/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cyber-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {card.title}
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {/* Copy Checklist Option */}
        <button
          onClick={handleCopyChecklist}
          disabled={checklist.length === 0}
          className={`
            w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
            ${checklist.length === 0
              ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
              : theme === 'dark' 
                ? 'text-gray-300 hover:bg-charcoal-700' 
                : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy Checklist</span>
              {checklist.length === 0 && (
                <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Empty
                </span>
              )}
            </>
          )}
        </button>

        {/* Clear Completed Option */}
        <button
          onClick={async () => {
            if (completedCount === 0) return;
            await clearCompletedChecklistItems(columnId, card.id);
            setCleared(true);
            setTimeout(() => {
              setCleared(false);
              onClose();
            }, 1000);
          }}
          disabled={completedCount === 0}
          className={`
            w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
            ${completedCount === 0
              ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
              : theme === 'dark' 
                ? 'text-gray-300 hover:bg-charcoal-700' 
                : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          {cleared ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-500">Cleared!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear Completed</span>
              {completedCount > 0 ? (
                <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {completedCount}
                </span>
              ) : (
                <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                  None
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Info Footer when no checklist */}
      {checklist.length === 0 && (
        <div className={`
          px-3 py-2 text-xs border-t
          ${theme === 'dark' ? 'border-charcoal-700 text-gray-500 bg-charcoal-700/30' : 'border-gray-100 text-gray-400 bg-gray-50'}
        `}>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This card has no checklist items
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default CardContextMenu;
