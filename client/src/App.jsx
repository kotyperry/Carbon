import { useEffect, useState } from 'react';
import { useBoardStore } from './store/boardStore';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import BookmarksView from './components/BookmarksView';
import NotesView from './components/NotesView';
import TitlebarDragRegion from './components/TitlebarDragRegion';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const { fetchData, isLoading, error, theme, activeView } = useBoardStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-charcoal-900 text-white' : 'bg-gray-50 text-gray-900'} noise-bg`}>
      {/* Titlebar drag region for Tauri */}
      <TitlebarDragRegion />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
    </div>
  );
}

export default App;
