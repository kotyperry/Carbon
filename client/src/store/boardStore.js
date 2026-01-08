import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__;
};

// Dynamic import for Tauri API
let invoke = null;
if (isTauri()) {
  import('@tauri-apps/api/core').then((module) => {
    invoke = module.invoke;
  });
}

// Predefined labels with colors (for kanban cards)
export const LABELS = {
  bug: { name: 'bug', color: 'bg-red-500', textColor: 'text-red-500' },
  feature: { name: 'feature', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  urgent: { name: 'urgent', color: 'bg-orange-500', textColor: 'text-orange-500' },
  idea: { name: 'idea', color: 'bg-purple-500', textColor: 'text-purple-500' },
  docs: { name: 'docs', color: 'bg-blue-500', textColor: 'text-blue-500' },
  design: { name: 'design', color: 'bg-pink-500', textColor: 'text-pink-500' },
};

// Priority levels with colors
export const PRIORITIES = {
  low: { name: 'Low', color: 'bg-slate-400', borderColor: 'border-l-slate-400' },
  medium: { name: 'Medium', color: 'bg-blue-400', borderColor: 'border-l-blue-400' },
  high: { name: 'High', color: 'bg-orange-400', borderColor: 'border-l-orange-400' },
  critical: { name: 'Critical', color: 'bg-red-500', borderColor: 'border-l-red-500' },
};

// Default bookmark tags with colors (these are built-in)
export const DEFAULT_BOOKMARK_TAGS = {
  react: { name: 'React', color: 'bg-sky-500' },
  typescript: { name: 'TypeScript', color: 'bg-blue-600' },
  'ui-ux': { name: 'UI/UX', color: 'bg-pink-500' },
  nextjs: { name: 'Next.js', color: 'bg-neutral-800' },
  tailwind: { name: 'Tailwind', color: 'bg-teal-500' },
  tutorial: { name: 'Tutorial', color: 'bg-amber-500' },
  documentation: { name: 'Documentation', color: 'bg-violet-500' },
  free: { name: 'Free', color: 'bg-emerald-500' },
  tool: { name: 'Tool', color: 'bg-orange-500' },
  inspiration: { name: 'Inspiration', color: 'bg-rose-500' },
};

// Available colors for custom tags
export const TAG_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

// This will be populated with both default and custom tags
export let BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS };

// API helper functions
const api = {
  async readData() {
    if (isTauri() && invoke) {
      return await invoke('read_data');
    }
    // Fallback to HTTP API for development without Tauri
    const response = await fetch('/api/data');
    return await response.json();
  },
  
  async writeData(data) {
    if (isTauri() && invoke) {
      return await invoke('write_data', { data });
    }
    // Fallback to HTTP API for development without Tauri
    const response = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.ok;
  }
};

export const useBoardStore = create((set, get) => ({
  // State
  boards: [],
  activeBoard: null,
  theme: 'dark',
  isLoading: true,
  error: null,
  showArchive: false,
  
  // Bookmarks state
  bookmarks: [],
  collections: [],
  customTags: {}, // User-created tags
  activeCollection: 'all',
  activeTag: null,
  bookmarkSearch: '',
  bookmarkSort: 'date', // 'date', 'title', 'domain'
  
  // View state
  activeView: 'boards', // 'boards' or 'bookmarks'

  // Set active view
  setActiveView: (view) => {
    set({ activeView: view });
  },

  // Fetch all data from Tauri backend or HTTP API
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      // Wait for Tauri invoke to be available if in Tauri
      if (isTauri() && !invoke) {
        const module = await import('@tauri-apps/api/core');
        invoke = module.invoke;
      }
      
      const data = await api.readData();
      
      // Merge custom tags with default tags
      const customTags = data.customTags || {};
      BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS, ...customTags };
      
      set({
        boards: data.boards || [],
        activeBoard: data.activeBoard,
        theme: data.theme || 'dark',
        bookmarks: data.bookmarks || [],
        collections: data.collections || [
          { id: 'all', name: 'All Bookmarks', icon: 'bookmark' },
          { id: 'favorites', name: 'Favorites', icon: 'star' },
          { id: 'archive', name: 'Archive', icon: 'archive' },
        ],
        customTags: customTags,
        activeView: data.activeView || 'boards',
        isLoading: false
      });
      // Apply theme to document
      document.documentElement.classList.toggle('dark', data.theme === 'dark');
      document.documentElement.classList.toggle('light', data.theme === 'light');
    } catch (error) {
      console.error('Failed to fetch data:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Save all data to Tauri backend or HTTP API
  saveData: async () => {
    const { boards, activeBoard, theme, bookmarks, collections, customTags, activeView } = get();
    try {
      await api.writeData({ boards, activeBoard, theme, bookmarks, collections, customTags, activeView });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },

  // Get current board
  getCurrentBoard: () => {
    const { boards, activeBoard } = get();
    return boards.find(b => b.id === activeBoard) || boards[0] || null;
  },

  // Toggle archive view
  toggleArchiveView: () => {
    set(state => ({ showArchive: !state.showArchive }));
  },

  // Board operations
  createBoard: async (name) => {
    const newBoard = {
      id: uuidv4(),
      name: name || 'New Board',
      columns: [
        { id: uuidv4(), title: 'To Do', cards: [] },
        { id: uuidv4(), title: 'In Progress', cards: [] },
        { id: uuidv4(), title: 'Done', cards: [] }
      ],
      archivedCards: []
    };
    set(state => ({
      boards: [...state.boards, newBoard],
      activeBoard: newBoard.id
    }));
    await get().saveData();
    return newBoard;
  },

  updateBoard: async (boardId, updates) => {
    set(state => ({
      boards: state.boards.map(b =>
        b.id === boardId ? { ...b, ...updates } : b
      )
    }));
    await get().saveData();
  },

  deleteBoard: async (boardId) => {
    set(state => {
      const newBoards = state.boards.filter(b => b.id !== boardId);
      return {
        boards: newBoards,
        activeBoard: state.activeBoard === boardId
          ? (newBoards[0]?.id || null)
          : state.activeBoard
      };
    });
    await get().saveData();
  },

  setActiveBoard: async (boardId) => {
    set({ activeBoard: boardId, showArchive: false });
    await get().saveData();
  },

  // Column operations
  addColumn: async (title) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const newColumn = {
      id: uuidv4(),
      title: title || 'New Column',
      cards: []
    };

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? { ...b, columns: [...b.columns, newColumn] }
          : b
      )
    }));
    await get().saveData();
  },

  updateColumn: async (columnId, updates) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId ? { ...c, ...updates } : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  deleteColumn: async (columnId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? { ...b, columns: b.columns.filter(c => c.id !== columnId) }
          : b
      )
    }));
    await get().saveData();
  },

  // Card operations
  addCard: async (columnId, title, description = '') => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const newCard = {
      id: uuidv4(),
      title,
      description,
      labels: [],
      priority: null,
      checklist: [],
      createdAt: new Date().toISOString()
    };

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? { ...c, cards: [...c.cards, newCard] }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
    return newCard;
  },

  updateCard: async (columnId, cardId, updates) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card =>
                        card.id === cardId ? { ...card, ...updates } : card
                      )
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  deleteCard: async (columnId, cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? { ...c, cards: c.cards.filter(card => card.id !== cardId) }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  // Label operations
  toggleCardLabel: async (columnId, cardId, labelKey) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card => {
                        if (card.id !== cardId) return card;
                        const labels = card.labels || [];
                        const hasLabel = labels.includes(labelKey);
                        return {
                          ...card,
                          labels: hasLabel
                            ? labels.filter(l => l !== labelKey)
                            : [...labels, labelKey]
                        };
                      })
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  // Priority operations
  setCardPriority: async (columnId, cardId, priority) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card =>
                        card.id === cardId ? { ...card, priority } : card
                      )
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  // Checklist operations
  addChecklistItem: async (columnId, cardId, text) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const newItem = {
      id: uuidv4(),
      text,
      completed: false
    };

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card =>
                        card.id === cardId
                          ? { ...card, checklist: [...(card.checklist || []), newItem] }
                          : card
                      )
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  toggleChecklistItem: async (columnId, cardId, itemId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).map(item =>
                                item.id === itemId
                                  ? { ...item, completed: !item.completed }
                                  : item
                              )
                            }
                          : card
                      )
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  deleteChecklistItem: async (columnId, cardId, itemId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map(card =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).filter(item => item.id !== itemId)
                            }
                          : card
                      )
                    }
                  : c
              )
            }
          : b
      )
    }));
    await get().saveData();
  },

  // Archive operations
  archiveCard: async (columnId, cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    // Find the card
    let cardToArchive = null;
    for (const col of board.columns) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) {
        cardToArchive = { ...card, archivedAt: new Date().toISOString(), originalColumnId: columnId };
        break;
      }
    }

    if (!cardToArchive) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === columnId
                  ? { ...c, cards: c.cards.filter(card => card.id !== cardId) }
                  : c
              ),
              archivedCards: [...(b.archivedCards || []), cardToArchive]
            }
          : b
      )
    }));
    await get().saveData();
  },

  restoreCard: async (cardId, targetColumnId = null) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const archivedCards = board.archivedCards || [];
    const cardToRestore = archivedCards.find(c => c.id === cardId);
    if (!cardToRestore) return;

    // Determine target column
    const destColumnId = targetColumnId || cardToRestore.originalColumnId || board.columns[0]?.id;
    if (!destColumnId) return;

    // Remove archive metadata
    const { archivedAt, originalColumnId, ...restoredCard } = cardToRestore;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map(c =>
                c.id === destColumnId
                  ? { ...c, cards: [...c.cards, restoredCard] }
                  : c
              ),
              archivedCards: (b.archivedCards || []).filter(c => c.id !== cardId)
            }
          : b
      )
    }));
    await get().saveData();
  },

  deleteArchivedCard: async (cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => ({
      boards: state.boards.map(b =>
        b.id === board.id
          ? {
              ...b,
              archivedCards: (b.archivedCards || []).filter(c => c.id !== cardId)
            }
          : b
      )
    }));
    await get().saveData();
  },

  // Move card between columns or reorder within column
  moveCard: async (cardId, sourceColumnId, destColumnId, destIndex) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => {
      const boardIndex = state.boards.findIndex(b => b.id === board.id);
      if (boardIndex === -1) return state;

      const newBoards = [...state.boards];
      const newBoard = { ...newBoards[boardIndex] };
      newBoard.columns = newBoard.columns.map(c => ({ ...c, cards: [...c.cards] }));

      // Find source column and card
      const sourceCol = newBoard.columns.find(c => c.id === sourceColumnId);
      const destCol = newBoard.columns.find(c => c.id === destColumnId);
      
      if (!sourceCol || !destCol) return state;

      const cardIndex = sourceCol.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return state;

      // Remove card from source
      const [card] = sourceCol.cards.splice(cardIndex, 1);

      // Add card to destination
      destCol.cards.splice(destIndex, 0, card);

      newBoards[boardIndex] = newBoard;
      return { boards: newBoards };
    });
    await get().saveData();
  },

  // Reorder columns
  moveColumn: async (columnId, newIndex) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set(state => {
      const boardIndex = state.boards.findIndex(b => b.id === board.id);
      if (boardIndex === -1) return state;

      const newBoards = [...state.boards];
      const newBoard = { ...newBoards[boardIndex] };
      const columns = [...newBoard.columns];

      const oldIndex = columns.findIndex(c => c.id === columnId);
      if (oldIndex === -1) return state;

      const [column] = columns.splice(oldIndex, 1);
      columns.splice(newIndex, 0, column);

      newBoard.columns = columns;
      newBoards[boardIndex] = newBoard;
      return { boards: newBoards };
    });
    await get().saveData();
  },

  // Theme
  toggleTheme: async () => {
    set(state => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      document.documentElement.classList.toggle('light', newTheme === 'light');
      return { theme: newTheme };
    });
    await get().saveData();
  },

  // ============================================
  // BOOKMARK OPERATIONS
  // ============================================

  // Set active collection filter
  setActiveCollection: (collectionId) => {
    set({ activeCollection: collectionId, activeTag: null });
  },

  // Set active tag filter
  setActiveTag: (tag) => {
    set({ activeTag: tag, activeCollection: tag ? null : 'all' });
  },

  // Set bookmark search
  setBookmarkSearch: (search) => {
    set({ bookmarkSearch: search });
  },

  // Set bookmark sort
  setBookmarkSort: (sort) => {
    set({ bookmarkSort: sort });
  },

  // Get filtered bookmarks
  getFilteredBookmarks: () => {
    const { bookmarks, activeCollection, activeTag, bookmarkSearch, bookmarkSort } = get();
    
    let filtered = [...bookmarks];

    // Filter by collection
    if (activeCollection === 'favorites') {
      filtered = filtered.filter(b => b.isFavorite);
    } else if (activeCollection === 'archive') {
      filtered = filtered.filter(b => b.isArchived);
    } else if (activeCollection && activeCollection !== 'all') {
      filtered = filtered.filter(b => b.collectionId === activeCollection);
    } else {
      // 'all' - exclude archived
      filtered = filtered.filter(b => !b.isArchived);
    }

    // Filter by tag
    if (activeTag) {
      filtered = filtered.filter(b => b.tags?.includes(activeTag));
    }

    // Filter by search
    if (bookmarkSearch) {
      const search = bookmarkSearch.toLowerCase();
      filtered = filtered.filter(b => 
        b.title?.toLowerCase().includes(search) ||
        b.description?.toLowerCase().includes(search) ||
        b.url?.toLowerCase().includes(search)
      );
    }

    // Sort
    switch (bookmarkSort) {
      case 'title':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'domain':
        filtered.sort((a, b) => {
          const domainA = new URL(a.url).hostname;
          const domainB = new URL(b.url).hostname;
          return domainA.localeCompare(domainB);
        });
        break;
      case 'date':
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filtered;
  },

  // Get all unique tags from bookmarks
  getAllTags: () => {
    const { bookmarks } = get();
    const tagSet = new Set();
    bookmarks.forEach(b => {
      (b.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  },

  // Get bookmark stats
  getBookmarkStats: () => {
    const { bookmarks } = get();
    const active = bookmarks.filter(b => !b.isArchived);
    return {
      total: active.length,
      favorites: bookmarks.filter(b => b.isFavorite).length,
      collections: new Set(active.map(b => b.collectionId).filter(Boolean)).size,
      tags: new Set(active.flatMap(b => b.tags || [])).size,
    };
  },

  // Add bookmark
  addBookmark: async (bookmarkData) => {
    const newBookmark = {
      id: uuidv4(),
      title: bookmarkData.title || 'Untitled',
      url: bookmarkData.url,
      description: bookmarkData.description || '',
      favicon: bookmarkData.favicon || null,
      image: bookmarkData.image || null,
      tags: bookmarkData.tags || [],
      collectionId: bookmarkData.collectionId || null,
      isFavorite: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      bookmarks: [newBookmark, ...state.bookmarks]
    }));
    await get().saveData();
    return newBookmark;
  },

  // Update bookmark
  updateBookmark: async (bookmarkId, updates) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b =>
        b.id === bookmarkId ? { ...b, ...updates } : b
      )
    }));
    await get().saveData();
  },

  // Delete bookmark
  deleteBookmark: async (bookmarkId) => {
    set(state => ({
      bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId)
    }));
    await get().saveData();
  },

  // Toggle bookmark favorite
  toggleBookmarkFavorite: async (bookmarkId) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b =>
        b.id === bookmarkId ? { ...b, isFavorite: !b.isFavorite } : b
      )
    }));
    await get().saveData();
  },

  // Archive bookmark
  archiveBookmark: async (bookmarkId) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b =>
        b.id === bookmarkId ? { ...b, isArchived: true } : b
      )
    }));
    await get().saveData();
  },

  // Restore bookmark from archive
  restoreBookmark: async (bookmarkId) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b =>
        b.id === bookmarkId ? { ...b, isArchived: false } : b
      )
    }));
    await get().saveData();
  },

  // Toggle bookmark tag
  toggleBookmarkTag: async (bookmarkId, tag) => {
    set(state => ({
      bookmarks: state.bookmarks.map(b => {
        if (b.id !== bookmarkId) return b;
        const tags = b.tags || [];
        const hasTag = tags.includes(tag);
        return {
          ...b,
          tags: hasTag ? tags.filter(t => t !== tag) : [...tags, tag]
        };
      })
    }));
    await get().saveData();
  },

  // Add custom collection
  addCollection: async (name) => {
    const newCollection = {
      id: uuidv4(),
      name,
      icon: 'folder',
      isCustom: true,
    };
    set(state => ({
      collections: [...state.collections, newCollection]
    }));
    await get().saveData();
    return newCollection;
  },

  // Delete collection
  deleteCollection: async (collectionId) => {
    set(state => ({
      collections: state.collections.filter(c => c.id !== collectionId),
      bookmarks: state.bookmarks.map(b =>
        b.collectionId === collectionId ? { ...b, collectionId: null } : b
      ),
      activeCollection: state.activeCollection === collectionId ? 'all' : state.activeCollection
    }));
    await get().saveData();
  },

  // Update collection
  updateCollection: async (collectionId, updates) => {
    set(state => ({
      collections: state.collections.map(c =>
        c.id === collectionId ? { ...c, ...updates } : c
      )
    }));
    await get().saveData();
  },

  // ============================================
  // CUSTOM TAG OPERATIONS
  // ============================================

  // Get all tags (default + custom)
  getBookmarkTags: () => {
    return BOOKMARK_TAGS;
  },

  // Add custom tag
  addCustomTag: async (name, color) => {
    const key = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if tag already exists
    if (BOOKMARK_TAGS[key]) {
      return { error: 'Tag already exists' };
    }

    const newTag = { name, color };
    
    // Update the global BOOKMARK_TAGS
    BOOKMARK_TAGS[key] = newTag;
    
    set(state => ({
      customTags: { ...state.customTags, [key]: newTag }
    }));
    await get().saveData();
    return { key, tag: newTag };
  },

  // Delete custom tag
  deleteCustomTag: async (tagKey) => {
    // Can't delete default tags
    if (DEFAULT_BOOKMARK_TAGS[tagKey]) {
      return { error: 'Cannot delete default tags' };
    }

    // Remove from global BOOKMARK_TAGS
    delete BOOKMARK_TAGS[tagKey];

    // Remove tag from all bookmarks that have it
    set(state => {
      const newCustomTags = { ...state.customTags };
      delete newCustomTags[tagKey];
      
      return {
        customTags: newCustomTags,
        bookmarks: state.bookmarks.map(b => ({
          ...b,
          tags: (b.tags || []).filter(t => t !== tagKey)
        }))
      };
    });
    await get().saveData();
  },

  // Update custom tag
  updateCustomTag: async (tagKey, updates) => {
    // Can't update default tags
    if (DEFAULT_BOOKMARK_TAGS[tagKey]) {
      return { error: 'Cannot update default tags' };
    }

    const currentTag = BOOKMARK_TAGS[tagKey];
    if (!currentTag) {
      return { error: 'Tag not found' };
    }

    const updatedTag = { ...currentTag, ...updates };
    BOOKMARK_TAGS[tagKey] = updatedTag;

    set(state => ({
      customTags: { ...state.customTags, [tagKey]: updatedTag }
    }));
    await get().saveData();
  },
}));
