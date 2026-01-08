import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBoardStore, DEFAULT_BOOKMARK_TAGS, TAG_COLORS } from '../store/boardStore';

function TagContextMenu({ tagKey, position, onClose }) {
  const { theme, deleteCustomTag, updateCustomTag, getBookmarkTags, setActiveTag, activeTag } = useBoardStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const BOOKMARK_TAGS = getBookmarkTags();
  const tag = BOOKMARK_TAGS[tagKey];
  const isDefaultTag = DEFAULT_BOOKMARK_TAGS[tagKey] !== undefined;

  useEffect(() => {
    if (tag) {
      setNewName(tag.name);
    }
  }, [tag]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

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

  if (!tag) return null;

  const handleRename = async () => {
    if (newName.trim() && newName !== tag.name) {
      await updateCustomTag(tagKey, { name: newName.trim() });
    }
    setIsRenaming(false);
    onClose();
  };

  const handleDelete = async () => {
    // If this tag is currently active, clear the filter
    if (activeTag === tagKey) {
      setActiveTag(null);
    }
    await deleteCustomTag(tagKey);
    onClose();
  };

  const handleColorChange = async (color) => {
    await updateCustomTag(tagKey, { color });
    setShowColorPicker(false);
  };

  // Calculate menu position to keep it on screen
  const menuStyle = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 9999,
  };

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
      {/* Tag Preview Header */}
      <div className={`px-3 py-2.5 border-b ${theme === 'dark' ? 'border-charcoal-700 bg-charcoal-700/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${tag.color}`} />
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setNewName(tag.name);
                }
              }}
              onBlur={handleRename}
              className={`
                flex-1 px-2 py-0.5 text-sm rounded
                ${theme === 'dark' 
                  ? 'bg-charcoal-600 text-white border-charcoal-500' 
                  : 'bg-white text-gray-900 border-gray-300'}
                border focus:border-cyber-cyan outline-none
              `}
            />
          ) : (
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {tag.name}
            </span>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {/* Rename Option */}
        <button
          onClick={() => {
            if (isDefaultTag) return;
            setIsRenaming(true);
          }}
          disabled={isDefaultTag}
          className={`
            w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
            ${isDefaultTag 
              ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
              : theme === 'dark' 
                ? 'text-gray-300 hover:bg-charcoal-700' 
                : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Rename</span>
          {isDefaultTag && (
            <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              Default
            </span>
          )}
        </button>

        {/* Change Color Option */}
        <div className="relative">
          <button
            onClick={() => {
              if (isDefaultTag) return;
              setShowColorPicker(!showColorPicker);
            }}
            disabled={isDefaultTag}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
              ${isDefaultTag 
                ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                : theme === 'dark' 
                  ? 'text-gray-300 hover:bg-charcoal-700' 
                  : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>Change Color</span>
            <svg className={`w-3 h-3 ml-auto transition-transform ${showColorPicker ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Color Picker Dropdown */}
          {showColorPicker && !isDefaultTag && (
            <div className={`
              px-3 py-2 border-t
              ${theme === 'dark' ? 'border-charcoal-700 bg-charcoal-750' : 'border-gray-100 bg-gray-50'}
            `}>
              <div className="grid grid-cols-8 gap-1.5">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`
                      w-5 h-5 rounded-full transition-transform hover:scale-110
                      ${color}
                      ${tag.color === color ? 'ring-2 ring-offset-2 ring-cyber-cyan' : ''}
                      ${theme === 'dark' ? 'ring-offset-charcoal-800' : 'ring-offset-white'}
                    `}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`my-1 border-t ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-100'}`} />

        {/* Delete Option */}
        <button
          onClick={handleDelete}
          disabled={isDefaultTag}
          className={`
            w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
            ${isDefaultTag 
              ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
              : 'text-red-500 hover:bg-red-500/10'}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete Tag</span>
          {isDefaultTag && (
            <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              Default
            </span>
          )}
        </button>
      </div>

      {/* Info Footer for Default Tags */}
      {isDefaultTag && (
        <div className={`
          px-3 py-2 text-xs border-t
          ${theme === 'dark' ? 'border-charcoal-700 text-gray-500 bg-charcoal-700/30' : 'border-gray-100 text-gray-400 bg-gray-50'}
        `}>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Default tags cannot be modified
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default TagContextMenu;
