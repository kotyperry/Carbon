import { useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './store/boardStore';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import BookmarksView from './components/BookmarksView';
import NotesView from './components/NotesView';
import TitlebarDragRegion from './components/TitlebarDragRegion';
import UpdateNotification from './components/UpdateNotification';
import { useHotkeys, HOTKEYS } from './hooks/useHotkeys';

function App() {
  const { fetchData, isLoading, error, theme, activeView, setActiveView, toggleTheme } = useBoardStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHotkeyHint, setShowHotkeyHint] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Keyboard hotkeys for navigation
  useHotkeys({
    [HOTKEYS.BOARDS]: () => setActiveView('boards'),
    [HOTKEYS.BOOKMARKS]: () => setActiveView('bookmarks'),
    [HOTKEYS.NOTES]: () => setActiveView('notes'),
    [HOTKEYS.TOGGLE_SIDEBAR]: toggleSidebar,
    [HOTKEYS.TOGGLE_THEME]: toggleTheme,
    '?': () => setShowHotkeyHint(prev => !prev),
    [HOTKEYS.ESCAPE]: () => setShowHotkeyHint(false),
  });

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-charcoal-900' : 'bg-gray-100'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyber-cyan/30 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-charcoal-900' : 'bg-gray-100'}`}>
        <div className="text-center px-4">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-cyber-cyan text-charcoal-900 rounded-xl font-medium hover:bg-cyber-cyan-dim transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-charcoal-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Titlebar drag region for Tauri */}
      <TitlebarDragRegion sidebarCollapsed={sidebarCollapsed} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'boards' && (
          <Board onMenuClick={() => setSidebarOpen(true)} />
        )}
        {activeView === 'bookmarks' && (
          <BookmarksView onMenuClick={() => setSidebarOpen(true)} />
        )}
        {activeView === 'notes' && (
          <NotesView onMenuClick={() => setSidebarOpen(true)} />
        )}
      </main>

      {/* Update notification */}
      <UpdateNotification />

      {/* Hotkey hint overlay */}
      {showHotkeyHint && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowHotkeyHint(false)}
        >
          <div 
            className={`
              max-w-md w-full mx-4 rounded-2xl p-6 shadow-2xl
              ${theme === 'dark' ? 'glass-modal' : 'bg-white border border-gray-200'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowHotkeyHint(false)}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-charcoal-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Navigation */}
              <div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Navigation
                </h3>
                <div className="space-y-2">
                  <HotkeyRow theme={theme} keys={['1']} description="Go to Boards" />
                  <HotkeyRow theme={theme} keys={['2']} description="Go to Bookmarks" />
                  <HotkeyRow theme={theme} keys={['3']} description="Go to Notes" />
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Actions
                </h3>
                <div className="space-y-2">
                  <HotkeyRow theme={theme} keys={['[']} description="Toggle sidebar" />
                  <HotkeyRow theme={theme} keys={['T']} description="Toggle theme" />
                  <HotkeyRow theme={theme} keys={['?']} description="Show/hide shortcuts" />
                  <HotkeyRow theme={theme} keys={['Esc']} description="Close dialogs" />
                </div>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t text-center text-xs ${theme === 'dark' ? 'border-charcoal-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              Press <kbd className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>?</kbd> anytime to toggle this panel
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hotkey row component for the shortcuts panel
function HotkeyRow({ theme, keys, description }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className={`
              px-2 py-1 text-xs font-mono rounded-md border
              ${theme === 'dark' 
                ? 'bg-charcoal-700 border-charcoal-600 text-gray-300' 
                : 'bg-gray-100 border-gray-200 text-gray-700'}
            `}
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export default App;
