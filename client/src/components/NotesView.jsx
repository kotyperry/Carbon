import { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import NoteCard from './NoteCard';
import NoteEditorModal from './NoteEditorModal';
import SyncStatus from './SyncStatus';

function NotesView({ onMenuClick }) {
  const { 
    theme,
    getFilteredNotes,
    noteSearch,
    setNoteSearch,
  } = useBoardStore();

  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const notes = getFilteredNotes();

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowEditorModal(true);
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setShowEditorModal(true);
  };

  const handleCloseModal = () => {
    setShowEditorModal(false);
    setEditingNote(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - with padding for macOS traffic lights when sidebar hidden */}
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
          <h2 className="text-xl sm:text-2xl font-mono font-bold truncate flex items-center gap-2">
            <svg className="w-6 h-6 text-cyber-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Quick Notes
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
          <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            placeholder="Search notes..."
            className={`
              bg-transparent border-none outline-none text-sm w-40
              ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
            `}
          />
          {noteSearch && (
            <button
              onClick={() => setNoteSearch('')}
              className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* iCloud Sync Status */}
        <SyncStatus />

        {/* New Note Button */}
        <button
          onClick={handleNewNote}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Note</span>
        </button>
      </header>

      {/* Mobile Search */}
      <div className={`sm:hidden px-4 py-3 border-b ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
          <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            placeholder="Search notes..."
            className={`
              flex-1 bg-transparent border-none outline-none text-sm
              ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
            `}
          />
          {noteSearch && (
            <button
              onClick={() => setNoteSearch('')}
              className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Notes Grid */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className={`text-lg font-mono mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {noteSearch ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {noteSearch ? 'Try a different search term' : 'Create your first quick note'}
            </p>
            {!noteSearch && (
              <button
                onClick={handleNewNote}
                className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={handleEditNote} />
            ))}
            
            {/* Add Note Button - matches kanban "Add Card" style */}
            <button
              onClick={handleNewNote}
              className={`
                p-4 rounded-xl border-2 border-dashed min-h-[120px]
                flex flex-col items-center justify-center gap-2 font-mono text-sm
                transition-colors
                ${theme === 'dark'
                  ? 'border-charcoal-600 text-gray-500 hover:border-cyber-cyan hover:text-cyber-cyan'
                  : 'border-gray-300 text-gray-400 hover:border-cyber-cyan hover:text-cyber-cyan'}
              `}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Note
            </button>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <NoteEditorModal
          note={editingNote}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default NotesView;
