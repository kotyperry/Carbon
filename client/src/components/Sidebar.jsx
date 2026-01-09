import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getVersion } from '@tauri-apps/api/app';
import { useBoardStore, DEFAULT_BOOKMARK_TAGS } from '../store/boardStore';
import TagContextMenu from './TagContextMenu';

function Sidebar({ isOpen, onClose }) {
  const {
    boards,
    activeBoard,
    setActiveBoard,
    createBoard,
    deleteBoard,
    updateBoard,
    theme,
    toggleTheme,
    // Bookmark state
    activeView,
    setActiveView,
    collections,
    activeCollection,
    setActiveCollection,
    activeTag,
    setActiveTag,
    getAllTags,
    getBookmarkStats,
    addCollection,
    deleteCollection,
    getBookmarkTags,
  } = useBoardStore();

  const BOOKMARK_TAGS = getBookmarkTags();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [tagContextMenu, setTagContextMenu] = useState(null); // { tagKey, x, y }

  const allTags = getAllTags();
  const stats = getBookmarkStats();
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('dev'));
  }, []);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (newBoardName.trim()) {
      await createBoard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
    }
  };

  const handleStartEdit = (board) => {
    setEditingId(board.id);
    setEditName(board.name);
  };

  const handleSaveEdit = async (boardId) => {
    if (editName.trim()) {
      await updateBoard(boardId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteBoard = (boardId, e) => {
    e.stopPropagation();
    if (boards.length > 1) {
      const board = boards.find(b => b.id === boardId);
      setDeletingBoard(board);
      setDeleteConfirmName('');
    }
  };

  const confirmDeleteBoard = async () => {
    if (deletingBoard && deleteConfirmName === deletingBoard.name) {
      await deleteBoard(deletingBoard.id);
      setDeletingBoard(null);
      setDeleteConfirmName('');
    }
  };

  const cancelDeleteBoard = () => {
    setDeletingBoard(null);
    setDeleteConfirmName('');
  };

  const handleBoardSelect = (boardId) => {
    setActiveBoard(boardId);
    setActiveView('boards');
    if (onClose) onClose();
  };

  const handleCollectionSelect = (collectionId) => {
    setActiveCollection(collectionId);
    setActiveView('bookmarks');
    if (onClose) onClose();
  };

  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setActiveView('bookmarks');
    if (onClose) onClose();
  };

  const handleTagContextMenu = (e, tagKey) => {
    e.preventDefault();
    e.stopPropagation();
    setTagContextMenu({
      tagKey,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeTagContextMenu = () => {
    setTagContextMenu(null);
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      await addCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreatingCollection(false);
    }
  };

  const getCollectionIcon = (icon) => {
    switch (icon) {
      case 'star':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case 'archive':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case 'folder':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'bookmark':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        );
    }
  };

  const sidebar = (
    <aside
      className={`
        ${isCollapsed ? 'lg:w-16' : 'lg:w-72'}
        ${theme === 'dark' ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}
        border-r flex flex-col transition-all duration-300 z-30
        
        /* Mobile: fixed overlay sidebar */
        fixed inset-y-0 left-0 w-72
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        
        /* Desktop: static sidebar */
        lg:relative lg:translate-x-0
      `}
    >
      {/* Header - with padding for macOS traffic lights */}
      <div className={`p-4 pt-10 border-b ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          {(!isCollapsed || window.innerWidth < 1024) && (
            <div className="flex items-center gap-2">
              <svg className="w-7 h-7" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#1a1a1a'}}/>
                    <stop offset="100%" style={{stopColor:'#0f0f0f'}}/>
                  </linearGradient>
                  <linearGradient id="logoBar1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#33e0ff'}}/>
                    <stop offset="100%" style={{stopColor:'#00a8cc'}}/>
                  </linearGradient>
                  <linearGradient id="logoBar2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#00d4ff'}}/>
                    <stop offset="100%" style={{stopColor:'#0090b0'}}/>
                  </linearGradient>
                  <linearGradient id="logoBar3" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#00c4ef'}}/>
                    <stop offset="100%" style={{stopColor:'#007a99'}}/>
                  </linearGradient>
                  <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.4"/>
                  </filter>
                </defs>
                <rect width="100" height="100" rx="20" fill="url(#logoBg)"/>
                <g filter="url(#logoShadow)">
                  <rect x="18" y="22" width="18" height="56" rx="4" fill="url(#logoBar1)"/>
                  <rect x="41" y="32" width="18" height="36" rx="4" fill="url(#logoBar2)"/>
                  <rect x="64" y="22" width="18" height="46" rx="4" fill="url(#logoBar3)"/>
                </g>
              </svg>
              <span className={`font-semibold text-lg tracking-tight ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Carbon</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Close button - mobile only */}
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors lg:hidden
                ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}
              `}
              title="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Collapse button - desktop only */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`
                p-2 rounded-lg transition-colors hidden lg:block
                ${theme === 'dark' ? 'hover:bg-charcoal-700' : 'hover:bg-gray-100'}
              `}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {(!isCollapsed || window.innerWidth < 1024) ? (
          <>
            {/* View Switcher - Icon Stack */}
            <div className={`p-2 border-b ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
              <div className={`flex flex-col gap-1 rounded-xl p-1.5 ${theme === 'dark' ? 'bg-charcoal-700/50' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setActiveView('boards')}
                  className={`
                    flex items-center justify-center p-2.5 rounded-lg transition-all
                    ${activeView === 'boards'
                      ? 'bg-cyber-cyan text-charcoal-900 shadow-sm'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-charcoal-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}
                  `}
                  title="Boards"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setActiveView('bookmarks');
                    setActiveCollection('all');
                  }}
                  className={`
                    flex items-center justify-center p-2.5 rounded-lg transition-all
                    ${activeView === 'bookmarks'
                      ? 'bg-cyber-cyan text-charcoal-900 shadow-sm'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-charcoal-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}
                  `}
                  title="Bookmarks"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveView('notes')}
                  className={`
                    flex items-center justify-center p-2.5 rounded-lg transition-all
                    ${activeView === 'notes'
                      ? 'bg-cyber-cyan text-charcoal-900 shadow-sm'
                      : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-charcoal-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}
                  `}
                  title="Notes"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Boards Section */}
            {activeView === 'boards' && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <span className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Boards
                  </span>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 rounded hover:bg-cyber-cyan/20 text-cyber-cyan"
                    title="Create new board"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* New Board Form */}
                {isCreating && (
                  <form onSubmit={handleCreateBoard} className="mb-2 px-2">
                    <input
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Board name..."
                      autoFocus
                      className={`
                        w-full px-3 py-2 rounded-lg text-sm
                        ${theme === 'dark' 
                          ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500' 
                          : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'}
                        border focus:border-cyber-cyan
                      `}
                      onBlur={() => {
                        if (!newBoardName.trim()) setIsCreating(false);
                      }}
                    />
                  </form>
                )}

                {/* Board Items */}
                <div className="space-y-1">
                  {boards.map((board) => (
                    <div
                      key={board.id}
                      onClick={() => handleBoardSelect(board.id)}
                      className={`
                        group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                        ${activeBoard === board.id && activeView === 'boards'
                          ? 'bg-cyber-cyan/20 text-cyber-cyan'
                          : theme === 'dark'
                            ? 'hover:bg-charcoal-700 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      {/* Board Icon */}
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>

                      {editingId === board.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleSaveEdit(board.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(board.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className={`
                            flex-1 px-2 py-0.5 rounded text-sm bg-transparent border
                            ${theme === 'dark' ? 'border-charcoal-600' : 'border-gray-300'}
                          `}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-sm truncate">{board.name}</span>
                      )}

                      {/* Actions */}
                      {editingId !== board.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(board);
                            }}
                            className="p-1 rounded hover:bg-white/10"
                            title="Rename board"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {boards.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteBoard(board.id, e)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-400"
                              title="Delete board"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookmarks Section */}
            {activeView === 'bookmarks' && (
              <div className="p-2">
                {/* Collections */}
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-2 mb-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Collections
                    </span>
                    <button
                      onClick={() => setIsCreatingCollection(true)}
                      className="p-1 rounded hover:bg-cyber-cyan/20 text-cyber-cyan"
                      title="Create new collection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* New Collection Form */}
                  {isCreatingCollection && (
                    <form onSubmit={handleCreateCollection} className="mb-2 px-2">
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Collection name..."
                        autoFocus
                        className={`
                          w-full px-3 py-2 rounded-lg text-sm
                          ${theme === 'dark' 
                            ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500' 
                            : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'}
                          border focus:border-cyber-cyan
                        `}
                        onBlur={() => {
                          if (!newCollectionName.trim()) setIsCreatingCollection(false);
                        }}
                      />
                    </form>
                  )}

                  <div className="space-y-1">
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        onClick={() => handleCollectionSelect(collection.id)}
                        className={`
                          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                          ${activeCollection === collection.id && !activeTag
                            ? 'bg-cyber-cyan/20 text-cyber-cyan'
                            : theme === 'dark'
                              ? 'hover:bg-charcoal-700 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        {getCollectionIcon(collection.icon)}
                        <span className="flex-1 text-sm truncate">{collection.name}</span>
                        {collection.id === 'all' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-charcoal-600 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {stats.total}
                          </span>
                        )}
                        {collection.id === 'favorites' && stats.favorites > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-charcoal-600 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {stats.favorites}
                          </span>
                        )}
                        {collection.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCollection(collection.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div>
                    <div className="px-2 py-2 mb-2">
                      <span className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Tags
                      </span>
                    </div>
                    <div className="space-y-1">
                      {allTags.map((tagKey) => {
                        const tag = BOOKMARK_TAGS[tagKey];
                        if (!tag) return null;
                        const isCustomTag = !DEFAULT_BOOKMARK_TAGS[tagKey];
                        return (
                          <div
                            key={tagKey}
                            onClick={() => handleTagSelect(tagKey)}
                            onContextMenu={(e) => handleTagContextMenu(e, tagKey)}
                            className={`
                              group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                              ${activeTag === tagKey
                                ? 'bg-cyber-cyan/20 text-cyber-cyan'
                                : theme === 'dark'
                                  ? 'hover:bg-charcoal-700 text-gray-300'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }
                            `}
                          >
                            <span className={`w-3 h-3 rounded-full ${tag.color}`} />
                            <span className="flex-1 text-sm">{tag.name}</span>
                            {/* Context menu indicator for custom tags */}
                            {isCustomTag && (
                              <button
                                onClick={(e) => handleTagContextMenu(e, tagKey)}
                                className={`
                                  p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity
                                  ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-200'}
                                `}
                                title="Tag options"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Collapsed state icons */
          <div className="p-2 space-y-2">
            <button
              onClick={() => setActiveView('boards')}
              className={`
                w-full p-2 rounded-lg transition-colors
                ${activeView === 'boards' ? 'bg-cyber-cyan/20 text-cyber-cyan' : theme === 'dark' ? 'text-gray-400 hover:bg-charcoal-700' : 'text-gray-500 hover:bg-gray-100'}
              `}
              title="Boards"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => {
                setActiveView('bookmarks');
                setActiveCollection('all');
              }}
              className={`
                w-full p-2 rounded-lg transition-colors
                ${activeView === 'bookmarks' ? 'bg-cyber-cyan/20 text-cyber-cyan' : theme === 'dark' ? 'text-gray-400 hover:bg-charcoal-700' : 'text-gray-500 hover:bg-gray-100'}
              `}
              title="Bookmarks"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveView('notes')}
              className={`
                w-full p-2 rounded-lg transition-colors
                ${activeView === 'notes' ? 'bg-cyber-cyan/20 text-cyber-cyan' : theme === 'dark' ? 'text-gray-400 hover:bg-charcoal-700' : 'text-gray-500 hover:bg-gray-100'}
              `}
              title="Notes"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Footer - Theme Toggle & Version */}
      <div className={`p-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`
            relative w-14 h-7 rounded-full transition-colors duration-300 ease-in-out
            ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-200'}
          `}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {/* Toggle track icons */}
          <div className="absolute inset-0 flex items-center justify-between px-1.5">
            {/* Sun icon (left side) */}
            <svg 
              className={`w-4 h-4 transition-opacity duration-300 ${theme === 'dark' ? 'opacity-30 text-gray-500' : 'opacity-0'}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
            {/* Moon icon (right side) */}
            <svg 
              className={`w-4 h-4 transition-opacity duration-300 ${theme === 'dark' ? 'opacity-0' : 'opacity-30 text-gray-400'}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </div>
          {/* Toggle knob */}
          <div 
            className={`
              absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-all duration-300 ease-in-out
              flex items-center justify-center
              ${theme === 'dark' 
                ? 'translate-x-7 bg-charcoal-500' 
                : 'translate-x-0.5 bg-white'
              }
            `}
          >
            {theme === 'dark' ? (
              <svg className="w-3.5 h-3.5 text-cyber-cyan" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
        
        {/* Version */}
        {(!isCollapsed || window.innerWidth < 1024) && appVersion && (
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            v{appVersion}
          </div>
        )}
      </div>

    </aside>
  );

  // Delete Board Confirmation Modal - rendered via portal to center on screen
  const deleteModal = deletingBoard && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={`
          w-full max-w-md rounded-2xl p-6 shadow-2xl
          ${theme === 'dark' ? 'bg-charcoal-800 border border-charcoal-700' : 'bg-white border border-gray-200'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className={`text-lg font-semibold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Delete Board
        </h3>

        {/* Description */}
        <p className={`text-sm text-center mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          This action cannot be undone. All cards and columns in this board will be permanently deleted.
        </p>

        {/* Confirmation Input */}
        <div className="mb-4">
          <label className={`block text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Type <span className="font-semibold text-red-500">"{deletingBoard.name}"</span> to confirm:
          </label>
          <input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder="Enter board name..."
            autoFocus
            className={`
              w-full px-4 py-2.5 rounded-lg text-sm
              ${theme === 'dark' 
                ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500' 
                : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'}
              border focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors
            `}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirmName === deletingBoard.name) {
                confirmDeleteBoard();
              }
              if (e.key === 'Escape') {
                cancelDeleteBoard();
              }
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={cancelDeleteBoard}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${theme === 'dark' 
                ? 'bg-charcoal-700 hover:bg-charcoal-600 text-gray-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
            `}
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteBoard}
            disabled={deleteConfirmName !== deletingBoard.name}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${deleteConfirmName === deletingBoard.name
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : theme === 'dark'
                  ? 'bg-charcoal-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            Delete Board
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {sidebar}
      {deleteModal}
      {/* Tag Context Menu */}
      {tagContextMenu && (
        <TagContextMenu
          tagKey={tagContextMenu.tagKey}
          position={{ x: tagContextMenu.x, y: tagContextMenu.y }}
          onClose={closeTagContextMenu}
        />
      )}
    </>
  );
}

export default Sidebar;
