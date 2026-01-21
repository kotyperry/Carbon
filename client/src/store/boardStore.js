import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__;
};

// Check if running on macOS (for CloudKit availability)
const isMacOS = () => {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform?.toLowerCase().includes("mac")
  );
};

// Dynamic import for Tauri API
let invoke = null;
if (isTauri()) {
  import("@tauri-apps/api/core").then((module) => {
    invoke = module.invoke;
  });
}

// Auto sync timers/listeners (module-scoped so we don't create multiple intervals)
let autoSyncIntervalId = null;
let syncListenersInstalled = false;
let lastLocalChangeAt = 0;
let syncInFlight = false;

// Background polling interval. CloudKit sync is relatively expensive (serialization + network),
// so avoid aggressive polling.
const AUTO_SYNC_INTERVAL_MS = 30_000;

// Debounce helper for sync operations
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Predefined labels with colors (for kanban cards)
export const LABELS = {
  bug: { name: "bug", color: "bg-red-500", textColor: "text-red-500" },
  feature: {
    name: "feature",
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
  },
  urgent: {
    name: "urgent",
    color: "bg-orange-500",
    textColor: "text-orange-500",
  },
  idea: { name: "idea", color: "bg-purple-500", textColor: "text-purple-500" },
  docs: { name: "docs", color: "bg-blue-500", textColor: "text-blue-500" },
  design: { name: "design", color: "bg-pink-500", textColor: "text-pink-500" },
};

// Priority levels with colors
export const PRIORITIES = {
  low: {
    name: "Low",
    color: "bg-slate-400",
    borderColor: "border-l-slate-400",
  },
  medium: {
    name: "Medium",
    color: "bg-blue-400",
    borderColor: "border-l-blue-400",
  },
  high: {
    name: "High",
    color: "bg-orange-400",
    borderColor: "border-l-orange-400",
  },
  critical: {
    name: "Critical",
    color: "bg-red-500",
    borderColor: "border-l-red-500",
  },
};

// Default bookmark tags with colors (these are built-in)
export const DEFAULT_BOOKMARK_TAGS = {
  react: { name: "React", color: "bg-sky-500" },
  typescript: { name: "TypeScript", color: "bg-blue-600" },
  "ui-ux": { name: "UI/UX", color: "bg-pink-500" },
  nextjs: { name: "Next.js", color: "bg-neutral-800" },
  tailwind: { name: "Tailwind", color: "bg-teal-500" },
  tutorial: { name: "Tutorial", color: "bg-amber-500" },
  documentation: { name: "Documentation", color: "bg-violet-500" },
  free: { name: "Free", color: "bg-emerald-500" },
  tool: { name: "Tool", color: "bg-orange-500" },
  inspiration: { name: "Inspiration", color: "bg-rose-500" },
};

// Available colors for custom tags
export const TAG_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

// This will be populated with both default and custom tags
export let BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS };

// API helper functions
const api = {
  async readData() {
    if (isTauri() && invoke) {
      return await invoke("read_data");
    }
    // Fallback to HTTP API for development without Tauri
    const response = await fetch("/api/data");
    return await response.json();
  },

  async writeData(data) {
    if (isTauri() && invoke) {
      return await invoke("write_data", { data });
    }
    // Fallback to HTTP API for development without Tauri
    const response = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok;
  },

  // CloudKit sync API (macOS only)
  async checkiCloudAccount() {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("check_icloud_account");
    }
    return false;
  },

  async getiCloudAccountStatus() {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("get_icloud_account_status");
    }
    return { available: false, status: "offline", error: "Not available" };
  },

  async getSyncStatus() {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("get_sync_status");
    }
    return { status: "offline", error: "Not available" };
  },

  async syncToCloud(data) {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("sync_to_cloud", { data });
    }
    return { success: false, error: "CloudKit not available" };
  },

  async pushToCloud(data) {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("push_to_cloud", { data });
    }
    return { success: false, error: "CloudKit not available" };
  },

  async syncFromCloud() {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("sync_from_cloud");
    }
    return { success: false, error: "CloudKit not available" };
  },

  async initCloudKit() {
    if (isTauri() && invoke && isMacOS()) {
      return await invoke("init_cloudkit");
    }
    return false;
  },
};

export const useBoardStore = create((set, get) => ({
  // State
  boards: [],
  activeBoard: null,
  theme: "dark",
  isLoading: true,
  error: null,
  showArchive: false,

  // Bookmarks state
  bookmarks: [],
  bookmarkFolders: [], // Folders for grouping bookmarks (iPhone-style)
  activeBookmarkFolder: null, // Currently viewing folder (null = root level)
  collections: [],
  customTags: {}, // User-created tags
  activeCollection: "all",
  activeTag: null,
  bookmarkSearch: "",
  bookmarkSort: "date", // 'date', 'title', 'domain'

  // Notes state
  notes: [],
  noteSearch: "",

  // View state
  activeView: "boards", // 'boards', 'bookmarks', or 'notes'

  // iCloud Sync state
  syncEnabled: false,
  syncStatus: "idle", // 'idle', 'syncing', 'synced', 'error', 'offline'
  syncError: null,
  lastModified: new Date().toISOString(),
  lastSyncedAt: null, // last time a sync completed successfully (push or pull)
  iCloudAvailable: false,
  iCloudStatus: null, // 'available' | 'no_account' | 'restricted' | 'could_not_determine' | 'temporarily_unavailable' | 'error'
  iCloudStatusError: null,

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
        const module = await import("@tauri-apps/api/core");
        invoke = module.invoke;
      }

      const data = await api.readData();

      // Merge custom tags with default tags
      const customTags = data.customTags || {};
      BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS, ...customTags };

      // Check iCloud availability on macOS
      let iCloudAvailable = false;
      let iCloudStatus = null;
      let iCloudStatusError = null;
      if (isTauri() && isMacOS()) {
        try {
          const statusResult = await api.getiCloudAccountStatus();
          iCloudAvailable = !!statusResult?.available;
          iCloudStatus = statusResult?.status || null;
          iCloudStatusError = statusResult?.error || null;
        } catch (e) {
          console.log("iCloud check failed:", e);
        }
      }

      set({
        boards: data.boards || [],
        activeBoard: data.activeBoard,
        theme: data.theme || "dark",
        bookmarks: data.bookmarks || [],
        bookmarkFolders: data.bookmarkFolders || [],
        collections: data.collections || [
          { id: "all", name: "All Bookmarks", icon: "bookmark" },
          { id: "favorites", name: "Favorites", icon: "star" },
          { id: "archive", name: "Archive", icon: "archive" },
        ],
        customTags: customTags,
        notes: data.notes || [],
        activeView: data.activeView || "boards",
        syncEnabled: data.syncEnabled || false,
        lastModified: data.lastModified || new Date().toISOString(),
        iCloudAvailable,
        iCloudStatus,
        iCloudStatusError,
        isLoading: false,
      });
      // Apply theme to document
      document.documentElement.classList.toggle("dark", data.theme === "dark");
      document.documentElement.classList.toggle(
        "light",
        data.theme === "light"
      );

      // If sync is enabled and iCloud is available, perform initial sync
      // Always install listeners once on macOS so changes on other devices can be pulled in.
      get().ensureSyncEventListeners();

      if (data.syncEnabled && iCloudAvailable) {
        // Start background sync + do an initial sync immediately.
        get().startAutoSync();
        get().performSync();
      } else {
        get().stopAutoSync();
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Save all data to Tauri backend or HTTP API
  saveData: async () => {
    const {
      boards,
      activeBoard,
      theme,
      bookmarks,
      bookmarkFolders,
      collections,
      customTags,
      notes,
      activeView,
      syncEnabled,
    } = get();
    const lastModified = new Date().toISOString();

    try {
      await api.writeData({
        boards,
        activeBoard,
        theme,
        bookmarks,
        bookmarkFolders,
        collections,
        customTags,
        notes,
        activeView,
        lastModified,
        syncEnabled,
      });

      set({ lastModified });
      // Mark local change time so background polling doesn't fight the debounced push
      lastLocalChangeAt = Date.now();

      // Trigger sync if enabled (debounced)
      if (syncEnabled) {
        get().debouncedSync();
      }
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  },

  // Debounced sync to avoid too many sync calls
  debouncedSync: debounce(async () => {
    const store = useBoardStore.getState();
    if (store.syncEnabled && store.iCloudAvailable) {
      await store.performSync({ mode: "push" });
    }
  }, 2000),

  // Install focus/visibility listeners once to keep devices in sync
  ensureSyncEventListeners: () => {
    if (!isTauri() || !isMacOS()) return;
    if (syncListenersInstalled) return;
    syncListenersInstalled = true;

    const onWakeOrFocus = async () => {
      const store = useBoardStore.getState();
      // Refresh account availability (network / iCloud state can change)
      await store.checkiCloudAvailability();
      if (store.syncEnabled && store.iCloudAvailable) {
        store.startAutoSync();
        store.performSync();
      }
    };

    window.addEventListener("focus", onWakeOrFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        onWakeOrFocus();
      }
    });
  },

  // Start/stop background auto-sync (polling)
  startAutoSync: () => {
    if (!isTauri() || !isMacOS()) return;

    const store = useBoardStore.getState();
    if (!store.syncEnabled || !store.iCloudAvailable) return;

    // Already running
    if (autoSyncIntervalId) return;

    // Poll for remote changes. performSync() is bidirectional (LWW), so it can pull remote updates too.
    autoSyncIntervalId = setInterval(() => {
      const s = useBoardStore.getState();
      if (!s.syncEnabled || !s.iCloudAvailable) return;
      if (syncInFlight) return;
      // If the user just changed data locally, let the debounced push handle it.
      if (Date.now() - lastLocalChangeAt < 3500) return;
      // Background polling should be pull-only to avoid re-uploading the entire dataset.
      s.performSync({ quiet: true, mode: "pull" });
    }, AUTO_SYNC_INTERVAL_MS);
  },

  stopAutoSync: () => {
    if (autoSyncIntervalId) {
      clearInterval(autoSyncIntervalId);
      autoSyncIntervalId = null;
    }
  },

  // Get current board
  getCurrentBoard: () => {
    const { boards, activeBoard } = get();
    return boards.find((b) => b.id === activeBoard) || boards[0] || null;
  },

  // Toggle archive view
  toggleArchiveView: () => {
    set((state) => ({ showArchive: !state.showArchive }));
  },

  // Board operations
  createBoard: async (name) => {
    const newBoard = {
      id: uuidv4(),
      name: name || "New Board",
      columns: [
        { id: uuidv4(), title: "To Do", cards: [] },
        { id: uuidv4(), title: "In Progress", cards: [] },
        { id: uuidv4(), title: "Done", cards: [] },
      ],
      archivedCards: [],
    };
    set((state) => ({
      boards: [...state.boards, newBoard],
      activeBoard: newBoard.id,
    }));
    await get().saveData();
    return newBoard;
  },

  updateBoard: async (boardId, updates) => {
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId ? { ...b, ...updates } : b
      ),
    }));
    await get().saveData();
  },

  deleteBoard: async (boardId) => {
    set((state) => {
      const newBoards = state.boards.filter((b) => b.id !== boardId);
      return {
        boards: newBoards,
        activeBoard:
          state.activeBoard === boardId
            ? newBoards[0]?.id || null
            : state.activeBoard,
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
      title: title || "New Column",
      cards: [],
    };

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id ? { ...b, columns: [...b.columns, newColumn] } : b
      ),
    }));
    await get().saveData();
  },

  updateColumn: async (columnId, updates) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, ...updates } : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  deleteColumn: async (columnId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? { ...b, columns: b.columns.filter((c) => c.id !== columnId) }
          : b
      ),
    }));
    await get().saveData();
  },

  // Card operations
  addCard: async (columnId, title, description = "") => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const newCard = {
      id: uuidv4(),
      title,
      description,
      labels: [],
      priority: null,
      checklist: [],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, cards: [...c.cards, newCard] } : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
    return newCard;
  },

  updateCard: async (columnId, cardId, updates) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId ? { ...card, ...updates } : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  deleteCard: async (columnId, cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.filter((card) => card.id !== cardId),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  // Label operations
  toggleCardLabel: async (columnId, cardId, labelKey) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) => {
                        if (card.id !== cardId) return card;
                        const labels = card.labels || [];
                        const hasLabel = labels.includes(labelKey);
                        return {
                          ...card,
                          labels: hasLabel
                            ? labels.filter((l) => l !== labelKey)
                            : [...labels, labelKey],
                        };
                      }),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  // Priority operations
  setCardPriority: async (columnId, cardId, priority) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId ? { ...card, priority } : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
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
      completed: false,
    };

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: [...(card.checklist || []), newItem],
                            }
                          : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  toggleChecklistItem: async (columnId, cardId, itemId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).map((item) =>
                                item.id === itemId
                                  ? { ...item, completed: !item.completed }
                                  : item
                              ),
                            }
                          : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  deleteChecklistItem: async (columnId, cardId, itemId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).filter(
                                (item) => item.id !== itemId
                              ),
                            }
                          : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  updateChecklistItem: async (columnId, cardId, itemId, newText) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).map((item) =>
                                item.id === itemId
                                  ? { ...item, text: newText }
                                  : item
                              ),
                            }
                          : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  clearCompletedChecklistItems: async (columnId, cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.map((card) =>
                        card.id === cardId
                          ? {
                              ...card,
                              checklist: (card.checklist || []).filter(
                                (item) => !item.completed
                              ),
                            }
                          : card
                      ),
                    }
                  : c
              ),
            }
          : b
      ),
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
      const card = col.cards.find((c) => c.id === cardId);
      if (card) {
        cardToArchive = {
          ...card,
          archivedAt: new Date().toISOString(),
          originalColumnId: columnId,
        };
        break;
      }
    }

    if (!cardToArchive) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId
                  ? {
                      ...c,
                      cards: c.cards.filter((card) => card.id !== cardId),
                    }
                  : c
              ),
              archivedCards: [...(b.archivedCards || []), cardToArchive],
            }
          : b
      ),
    }));
    await get().saveData();
  },

  restoreCard: async (cardId, targetColumnId = null) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    const archivedCards = board.archivedCards || [];
    const cardToRestore = archivedCards.find((c) => c.id === cardId);
    if (!cardToRestore) return;

    // Determine target column
    const destColumnId =
      targetColumnId || cardToRestore.originalColumnId || board.columns[0]?.id;
    if (!destColumnId) return;

    // Remove archive metadata
    const { archivedAt, originalColumnId, ...restoredCard } = cardToRestore;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === destColumnId
                  ? { ...c, cards: [...c.cards, restoredCard] }
                  : c
              ),
              archivedCards: (b.archivedCards || []).filter(
                (c) => c.id !== cardId
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  deleteArchivedCard: async (cardId) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === board.id
          ? {
              ...b,
              archivedCards: (b.archivedCards || []).filter(
                (c) => c.id !== cardId
              ),
            }
          : b
      ),
    }));
    await get().saveData();
  },

  // Move card between columns or reorder within column
  moveCard: async (cardId, sourceColumnId, destColumnId, destIndex) => {
    const board = get().getCurrentBoard();
    if (!board) return;

    set((state) => {
      const boardIndex = state.boards.findIndex((b) => b.id === board.id);
      if (boardIndex === -1) return state;

      const newBoards = [...state.boards];
      const newBoard = { ...newBoards[boardIndex] };
      newBoard.columns = newBoard.columns.map((c) => ({
        ...c,
        cards: [...c.cards],
      }));

      // Find source column and card
      const sourceCol = newBoard.columns.find((c) => c.id === sourceColumnId);
      const destCol = newBoard.columns.find((c) => c.id === destColumnId);

      if (!sourceCol || !destCol) return state;

      const cardIndex = sourceCol.cards.findIndex((c) => c.id === cardId);
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

    set((state) => {
      const boardIndex = state.boards.findIndex((b) => b.id === board.id);
      if (boardIndex === -1) return state;

      const newBoards = [...state.boards];
      const newBoard = { ...newBoards[boardIndex] };
      const columns = [...newBoard.columns];

      const oldIndex = columns.findIndex((c) => c.id === columnId);
      if (oldIndex === -1) return state;

      const [column] = columns.splice(oldIndex, 1);
      columns.splice(newIndex, 0, column);

      newBoard.columns = columns;
      newBoards[boardIndex] = newBoard;
      return { boards: newBoards };
    });
    await get().saveData();
  },

  // Reorder boards in sidebar
  reorderBoards: async (boardId, newIndex) => {
    set((state) => {
      const boards = [...state.boards];
      const oldIndex = boards.findIndex((b) => b.id === boardId);
      if (oldIndex === -1) return state;

      const [board] = boards.splice(oldIndex, 1);
      boards.splice(newIndex, 0, board);

      return { boards };
    });
    await get().saveData();
  },

  // Theme
  toggleTheme: async () => {
    set((state) => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      document.documentElement.classList.toggle("light", newTheme === "light");
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
    set({ activeTag: tag, activeCollection: tag ? null : "all" });
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
    const {
      bookmarks,
      activeCollection,
      activeBookmarkFolder,
      activeTag,
      bookmarkSearch,
      bookmarkSort,
    } = get();

    let filtered = [...bookmarks];

    // Filter by collection (Favorites/Archive show all matching bookmarks regardless of folder)
    if (activeCollection === "favorites") {
      // Show all favorited bookmarks regardless of folder
      filtered = filtered.filter((b) => b.isFavorite && !b.isArchived);
    } else if (activeCollection === "archive") {
      // Show all archived bookmarks regardless of folder
      filtered = filtered.filter((b) => b.isArchived);
    } else {
      // For regular collections, apply folder filtering
      if (activeBookmarkFolder) {
        filtered = filtered.filter((b) => b.folderId === activeBookmarkFolder);
      } else {
        // At root level, only show bookmarks not in any folder
        filtered = filtered.filter((b) => !b.folderId);
      }

      // Filter by custom collection or exclude archived for "all"
      if (activeCollection && activeCollection !== "all") {
        filtered = filtered.filter((b) => b.collectionId === activeCollection && !b.isArchived);
      } else {
        // 'all' - exclude archived
        filtered = filtered.filter((b) => !b.isArchived);
      }
    }

    // Filter by tag
    if (activeTag) {
      filtered = filtered.filter((b) => b.tags?.includes(activeTag));
    }

    // Filter by search
    if (bookmarkSearch) {
      const search = bookmarkSearch.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title?.toLowerCase().includes(search) ||
          b.description?.toLowerCase().includes(search) ||
          b.url?.toLowerCase().includes(search)
      );
    }

    // Sort - use order field first if available, then fall back to other sort methods
    switch (bookmarkSort) {
      case "title":
        filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "domain":
        filtered.sort((a, b) => {
          const domainA = new URL(a.url).hostname;
          const domainB = new URL(b.url).hostname;
          return domainA.localeCompare(domainB);
        });
        break;
      case "date":
      default:
        // If bookmarks have order field, use it; otherwise sort by date
        if (filtered.some((b) => b.order !== undefined)) {
          filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
        } else {
          filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        break;
    }

    return filtered;
  },

  // Get all unique tags from bookmarks
  getAllTags: () => {
    const { bookmarks } = get();
    const tagSet = new Set();
    bookmarks.forEach((b) => {
      (b.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  },

  // Get bookmark stats
  getBookmarkStats: () => {
    const { bookmarks } = get();
    const active = bookmarks.filter((b) => !b.isArchived);
    return {
      total: active.length,
      favorites: bookmarks.filter((b) => b.isFavorite).length,
      collections: new Set(active.map((b) => b.collectionId).filter(Boolean))
        .size,
      tags: new Set(active.flatMap((b) => b.tags || [])).size,
    };
  },

  // Add bookmark
  addBookmark: async (bookmarkData) => {
    const newBookmark = {
      id: uuidv4(),
      title: bookmarkData.title || "Untitled",
      url: bookmarkData.url,
      description: bookmarkData.description || "",
      favicon: bookmarkData.favicon || null,
      image: bookmarkData.image || null,
      tags: bookmarkData.tags || [],
      collectionId: bookmarkData.collectionId || null,
      isFavorite: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      bookmarks: [newBookmark, ...state.bookmarks],
    }));
    await get().saveData();
    return newBookmark;
  },

  // Update bookmark
  updateBookmark: async (bookmarkId, updates) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, ...updates } : b
      ),
    }));
    await get().saveData();
  },

  // Delete bookmark
  deleteBookmark: async (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
    }));
    await get().saveData();
  },

  // Toggle bookmark favorite
  toggleBookmarkFavorite: async (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, isFavorite: !b.isFavorite } : b
      ),
    }));
    await get().saveData();
  },

  // Archive bookmark
  archiveBookmark: async (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, isArchived: true } : b
      ),
    }));
    await get().saveData();
  },

  // Restore bookmark from archive
  restoreBookmark: async (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, isArchived: false } : b
      ),
    }));
    await get().saveData();
  },

  // Toggle bookmark tag
  toggleBookmarkTag: async (bookmarkId, tag) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => {
        if (b.id !== bookmarkId) return b;
        const tags = b.tags || [];
        const hasTag = tags.includes(tag);
        return {
          ...b,
          tags: hasTag ? tags.filter((t) => t !== tag) : [...tags, tag],
        };
      }),
    }));
    await get().saveData();
  },

  // Add custom collection
  addCollection: async (name) => {
    const newCollection = {
      id: uuidv4(),
      name,
      icon: "folder",
      isCustom: true,
    };
    set((state) => ({
      collections: [...state.collections, newCollection],
    }));
    await get().saveData();
    return newCollection;
  },

  // Delete collection
  deleteCollection: async (collectionId) => {
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== collectionId),
      bookmarks: state.bookmarks.map((b) =>
        b.collectionId === collectionId ? { ...b, collectionId: null } : b
      ),
      activeCollection:
        state.activeCollection === collectionId
          ? "all"
          : state.activeCollection,
    }));
    await get().saveData();
  },

  // Update collection
  updateCollection: async (collectionId, updates) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId ? { ...c, ...updates } : c
      ),
    }));
    await get().saveData();
  },

  // ============================================
  // BOOKMARK FOLDER OPERATIONS (iPhone-style)
  // ============================================

  // Set active bookmark folder (for navigation)
  setActiveBookmarkFolder: (folderId) => {
    set({ activeBookmarkFolder: folderId });
  },

  // Create bookmark folder from two bookmarks (drag-drop)
  createBookmarkFolder: async (name, bookmarkIds, color = "bg-cyber-cyan") => {
    const { bookmarks, bookmarkFolders, activeCollection } = get();

    const newFolder = {
      id: uuidv4(),
      name: name || "New Folder",
      color: color,
      collectionId: activeCollection === "all" ? null : activeCollection,
      order: bookmarkFolders.length,
      createdAt: new Date().toISOString(),
    };

    // Update bookmarks to belong to this folder
    set((state) => ({
      bookmarkFolders: [...state.bookmarkFolders, newFolder],
      bookmarks: state.bookmarks.map((b) => {
        if (bookmarkIds.includes(b.id)) {
          return { ...b, folderId: newFolder.id };
        }
        return b;
      }),
    }));
    await get().saveData();
    return newFolder;
  },

  // Delete bookmark folder (move bookmarks to root)
  deleteBookmarkFolder: async (folderId) => {
    set((state) => ({
      bookmarkFolders: state.bookmarkFolders.filter((f) => f.id !== folderId),
      bookmarks: state.bookmarks.map((b) =>
        b.folderId === folderId ? { ...b, folderId: null } : b
      ),
      activeBookmarkFolder:
        state.activeBookmarkFolder === folderId ? null : state.activeBookmarkFolder,
    }));
    await get().saveData();
  },

  // Update bookmark folder
  updateBookmarkFolder: async (folderId, updates) => {
    set((state) => ({
      bookmarkFolders: state.bookmarkFolders.map((f) =>
        f.id === folderId ? { ...f, ...updates } : f
      ),
    }));
    await get().saveData();
  },

  // Move bookmark into a folder
  moveBookmarkToFolder: async (bookmarkId, folderId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, folderId } : b
      ),
    }));
    await get().saveData();
  },

  // Remove bookmark from folder (to root)
  removeBookmarkFromFolder: async (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, folderId: null } : b
      ),
    }));
    await get().saveData();
  },

  // Get bookmarks in a specific folder
  getBookmarksInFolder: (folderId) => {
    const { bookmarks } = get();
    return bookmarks
      .filter((b) => b.folderId === folderId && !b.isArchived)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  // Get folders for current collection
  getBookmarkFoldersForCollection: () => {
    const { bookmarkFolders, activeCollection } = get();

    if (activeCollection === "all") {
      // Show all folders that don't have a specific collection
      return bookmarkFolders
        .filter((f) => !f.collectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (activeCollection === "favorites" || activeCollection === "archive") {
      // Don't show folders in special collections
      return [];
    } else {
      return bookmarkFolders
        .filter((f) => f.collectionId === activeCollection)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  },

  // Reorder bookmarks (for drag and drop)
  reorderBookmarks: async (activeId, overId) => {
    const { bookmarks, activeBookmarkFolder } = get();

    // Get the active bookmark to determine context
    const activeBookmark = bookmarks.find((b) => b.id === activeId);
    if (!activeBookmark) return;

    // Only reorder within the same folder context
    const contextFolderId = activeBookmarkFolder || activeBookmark.folderId || null;
    const contextBookmarks = bookmarks.filter((b) =>
      (b.folderId || null) === contextFolderId
    );

    const activeIndex = contextBookmarks.findIndex((b) => b.id === activeId);
    const overIndex = contextBookmarks.findIndex((b) => b.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    // Reorder within context
    const reorderedContext = [...contextBookmarks];
    const [removed] = reorderedContext.splice(activeIndex, 1);
    reorderedContext.splice(overIndex, 0, removed);

    // Create a map of new orders for context bookmarks
    const newOrderMap = new Map();
    reorderedContext.forEach((b, index) => {
      newOrderMap.set(b.id, index);
    });

    set((state) => ({
      // Only update order for bookmarks in the same context
      bookmarks: state.bookmarks.map((b) => {
        if (newOrderMap.has(b.id)) {
          return { ...b, order: newOrderMap.get(b.id) };
        }
        return b;
      }),
    }));
    await get().saveData();
  },

  // Reorder folders (for drag and drop)
  reorderBookmarkFolders: async (activeId, overId) => {
    const { bookmarkFolders } = get();
    const activeIndex = bookmarkFolders.findIndex((f) => f.id === activeId);
    const overIndex = bookmarkFolders.findIndex((f) => f.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    set((state) => {
      const newFolders = [...state.bookmarkFolders];
      const [removed] = newFolders.splice(activeIndex, 1);
      newFolders.splice(overIndex, 0, removed);

      // Update order field for all folders
      return {
        bookmarkFolders: newFolders.map((f, index) => ({ ...f, order: index })),
      };
    });
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
    const key = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Check if tag already exists
    if (BOOKMARK_TAGS[key]) {
      return { error: "Tag already exists" };
    }

    const newTag = { name, color };

    // Update the global BOOKMARK_TAGS
    BOOKMARK_TAGS[key] = newTag;

    set((state) => ({
      customTags: { ...state.customTags, [key]: newTag },
    }));
    await get().saveData();
    return { key, tag: newTag };
  },

  // Delete custom tag
  deleteCustomTag: async (tagKey) => {
    // Can't delete default tags
    if (DEFAULT_BOOKMARK_TAGS[tagKey]) {
      return { error: "Cannot delete default tags" };
    }

    // Remove from global BOOKMARK_TAGS
    delete BOOKMARK_TAGS[tagKey];

    // Remove tag from all bookmarks that have it
    set((state) => {
      const newCustomTags = { ...state.customTags };
      delete newCustomTags[tagKey];

      return {
        customTags: newCustomTags,
        bookmarks: state.bookmarks.map((b) => ({
          ...b,
          tags: (b.tags || []).filter((t) => t !== tagKey),
        })),
      };
    });
    await get().saveData();
  },

  // Update custom tag
  updateCustomTag: async (tagKey, updates) => {
    // Can't update default tags
    if (DEFAULT_BOOKMARK_TAGS[tagKey]) {
      return { error: "Cannot update default tags" };
    }

    const currentTag = BOOKMARK_TAGS[tagKey];
    if (!currentTag) {
      return { error: "Tag not found" };
    }

    const updatedTag = { ...currentTag, ...updates };
    BOOKMARK_TAGS[tagKey] = updatedTag;

    set((state) => ({
      customTags: { ...state.customTags, [tagKey]: updatedTag },
    }));
    await get().saveData();
  },

  // ============================================
  // NOTES OPERATIONS
  // ============================================

  // Set note search
  setNoteSearch: (search) => {
    set({ noteSearch: search });
  },

  // Get filtered notes (pinned first, then by date)
  getFilteredNotes: () => {
    const { notes, noteSearch } = get();

    let filtered = [...notes];

    // Filter by search
    if (noteSearch) {
      const search = noteSearch.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(search) ||
          n.content?.toLowerCase().includes(search)
      );
    }

    // Sort: pinned first, then by updatedAt date (newest first)
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return filtered;
  },

  // Add note
  addNote: async (noteData = {}) => {
    const now = new Date().toISOString();
    const newNote = {
      id: uuidv4(),
      title: noteData.title || "Untitled Note",
      content: noteData.content || "",
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      notes: [newNote, ...state.notes],
    }));
    await get().saveData();
    return newNote;
  },

  // Update note
  updateNote: async (noteId, updates) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    await get().saveData();
  },

  // Delete note
  deleteNote: async (noteId) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== noteId),
    }));
    await get().saveData();
  },

  // Toggle note pin
  toggleNotePin: async (noteId) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId
          ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    await get().saveData();
  },

  // ============================================
  // ICLOUD SYNC OPERATIONS
  // ============================================

  // Toggle sync enabled
  toggleSyncEnabled: async () => {
    const { syncEnabled, iCloudAvailable, iCloudStatus, iCloudStatusError } =
      get();

    if (!iCloudAvailable) {
      const reason = iCloudStatusError
        ? `iCloud not available: ${iCloudStatusError}`
        : iCloudStatus
        ? `iCloud not available (${iCloudStatus}).`
        : "iCloud not available.";
      set({ syncError: reason });
      return;
    }

    const newSyncEnabled = !syncEnabled;
    set({ syncEnabled: newSyncEnabled, syncError: null });

    // Save the preference
    await get().saveData();

    // If enabling sync, perform initial sync
    if (newSyncEnabled) {
      get().startAutoSync();
      await get().performSync();
    } else {
      get().stopAutoSync();
    }
  },

  // Perform sync with iCloud
  performSync: async (options = {}) => {
    const quiet = !!options.quiet;
    const mode = options.mode || "full"; // 'full' | 'push' | 'pull'
    const {
      syncEnabled,
      iCloudAvailable,
      boards,
      activeBoard,
      theme,
      bookmarks,
      bookmarkFolders,
      collections,
      customTags,
      notes,
      activeView,
      lastModified,
    } = get();

    if (!syncEnabled || !iCloudAvailable) {
      return;
    }

    if (syncInFlight) return;
    syncInFlight = true;

    // For background polling, keep the UI stable (avoid flashing between "Syncing" and "Synced")
    if (!quiet) {
      set({ syncStatus: "syncing", syncError: null });
    } else {
      set({ syncError: null });
    }

    try {
      const data = {
        boards,
        activeBoard,
        theme,
        bookmarks,
        bookmarkFolders,
        collections,
        customTags,
        notes,
        activeView,
        lastModified,
        syncEnabled,
      };

      let result;
      if (mode === "pull") {
        result = await api.syncFromCloud();
      } else if (mode === "push") {
        result = await api.pushToCloud(data);
      } else {
        result = await api.syncToCloud(data);
      }

      if (result.success) {
        if (result.shouldUpdateLocal && result.data) {
          // Remote data is newer, update local state
          try {
            const remoteData = JSON.parse(result.data);
            const currentActiveView = get().activeView;

            // Merge custom tags
            const remoteTags = remoteData.customTags || {};
            BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS, ...remoteTags };

            set({
              boards: remoteData.boards || [],
              activeBoard: remoteData.activeBoard,
              theme: remoteData.theme || "dark",
              bookmarks: remoteData.bookmarks || [],
              bookmarkFolders: remoteData.bookmarkFolders || [],
              collections: remoteData.collections || get().collections,
              customTags: remoteTags,
              notes: remoteData.notes || [],
              // Do not sync UI navigation across devices
              activeView: currentActiveView,
              lastModified:
                result.remoteLastModified || remoteData.lastModified,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: "synced",
              syncError: null,
            });

            // Apply theme
            document.documentElement.classList.toggle(
              "dark",
              remoteData.theme === "dark"
            );
            document.documentElement.classList.toggle(
              "light",
              remoteData.theme === "light"
            );

            // Save the merged data locally
            await api.writeData({
              ...remoteData,
              activeView: currentActiveView,
              syncEnabled: true,
            });
          } catch (parseError) {
            console.error("Failed to parse remote data:", parseError);
            set({
              syncStatus: "error",
              syncError: "Failed to parse remote data",
            });
          }
        } else {
          set({
            syncStatus: "synced",
            syncError: null,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      } else {
        set({ syncStatus: "error", syncError: result.error || "Sync failed" });
      }
    } catch (error) {
      console.error("Sync error:", error);
      set({ syncStatus: "error", syncError: error.message || "Sync failed" });
    } finally {
      syncInFlight = false;
    }
  },

  // Pull data from iCloud (manual refresh)
  pullFromCloud: async () => {
    const { iCloudAvailable } = get();

    if (!iCloudAvailable) {
      set({ syncError: "iCloud is not available" });
      return;
    }

    set({ syncStatus: "syncing", syncError: null });

    try {
      const result = await api.syncFromCloud();

      if (result.success && result.data) {
        const remoteData = JSON.parse(result.data);
        const currentActiveView = get().activeView;

        // Merge custom tags
        const remoteTags = remoteData.customTags || {};
        BOOKMARK_TAGS = { ...DEFAULT_BOOKMARK_TAGS, ...remoteTags };

        set({
          boards: remoteData.boards || [],
          activeBoard: remoteData.activeBoard,
          theme: remoteData.theme || "dark",
          bookmarks: remoteData.bookmarks || [],
          bookmarkFolders: remoteData.bookmarkFolders || [],
          collections: remoteData.collections || get().collections,
          customTags: remoteTags,
          notes: remoteData.notes || [],
          // Do not sync UI navigation across devices
          activeView: currentActiveView,
          lastModified: result.remoteLastModified || remoteData.lastModified,
          syncStatus: "synced",
          syncError: null,
          lastSyncedAt: new Date().toISOString(),
        });

        // Apply theme
        document.documentElement.classList.toggle(
          "dark",
          remoteData.theme === "dark"
        );
        document.documentElement.classList.toggle(
          "light",
          remoteData.theme === "light"
        );

        // Save locally
        await api.writeData({
          ...remoteData,
          activeView: currentActiveView,
          syncEnabled: true,
        });
      } else if (result.success) {
        // No data in cloud yet
        set({
          syncStatus: "synced",
          syncError: null,
          lastSyncedAt: new Date().toISOString(),
        });
      } else {
        set({ syncStatus: "error", syncError: result.error || "Pull failed" });
      }
    } catch (error) {
      console.error("Pull error:", error);
      set({ syncStatus: "error", syncError: error.message || "Pull failed" });
    }
  },

  // Get sync status info
  getSyncInfo: () => {
    const {
      syncEnabled,
      syncStatus,
      syncError,
      lastModified,
      iCloudAvailable,
    } = get();
    return {
      enabled: syncEnabled,
      status: syncStatus,
      error: syncError,
      lastModified,
      available: iCloudAvailable,
    };
  },

  // Check iCloud availability
  checkiCloudAvailability: async () => {
    if (isTauri() && isMacOS()) {
      try {
        const statusResult = await api.getiCloudAccountStatus();
        const available = !!statusResult?.available;
        set({
          iCloudAvailable: available,
          iCloudStatus: statusResult?.status || null,
          iCloudStatusError: statusResult?.error || null,
        });
        return available;
      } catch (e) {
        console.error("Failed to check iCloud:", e);
        set({
          iCloudAvailable: false,
          iCloudStatus: null,
          iCloudStatusError: e?.message || String(e),
        });
        return false;
      }
    }
    set({
      iCloudAvailable: false,
      iCloudStatus: null,
      iCloudStatusError: null,
    });
    return false;
  },
}));
