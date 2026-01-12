import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBoardStore } from '../store/boardStore';
import ReactMarkdown from 'react-markdown';

function NoteEditorModal({ note, onClose }) {
  const { theme, addNote, updateNote } = useBoardStore();
  const isEditing = !!note;

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  const [isSaving, setIsSaving] = useState(false);

  // Focus title input on mount for new notes
  useEffect(() => {
    if (!isEditing) {
      const titleInput = document.getElementById('note-title-input');
      if (titleInput) titleInput.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateNote(note.id, { title: title.trim() || 'Untitled Note', content });
      } else {
        await addNote({ title: title.trim() || 'Untitled Note', content });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    // Save on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Close on Escape
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const modal = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div 
        className={`
          w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden
          ${theme === 'dark' ? 'glass-modal' : 'bg-white border border-gray-200'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
          {/* Title Input */}
          <input
            id="note-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className={`
              flex-1 text-xl font-semibold bg-transparent border-none outline-none
              ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
            `}
          />

          {/* Tab Switcher */}
          <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setActiveTab('write')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === 'write'
                  ? 'bg-cyber-cyan text-charcoal-900'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === 'preview'
                  ? 'bg-cyber-cyan text-charcoal-900'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              Preview
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={`
              p-2 rounded-lg transition-colors
              ${theme === 'dark' ? 'hover:bg-charcoal-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'write' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing... (Markdown supported)"
              className={`
                w-full h-full p-6 resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed
                ${theme === 'dark' ? 'text-gray-300 placeholder-gray-600' : 'text-gray-700 placeholder-gray-400'}
              `}
            />
          ) : (
            <div className={`
              h-full overflow-auto p-6 prose prose-sm max-w-none
              ${theme === 'dark' ? 'prose-invert' : ''}
            `}>
              {content ? (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{children}</h1>,
                    h2: ({ children }) => <h2 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{children}</h2>,
                    h3: ({ children }) => <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{children}</h3>,
                    p: ({ children }) => <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{children}</p>,
                    ul: ({ children }) => <ul className={`list-disc list-inside mb-4 space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ul>,
                    ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    code: ({ inline, children }) => 
                      inline ? (
                        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${theme === 'dark' ? 'bg-charcoal-700 text-cyber-cyan' : 'bg-gray-100 text-cyan-600'}`}>{children}</code>
                      ) : (
                        <code className={`block p-4 rounded-lg text-sm font-mono overflow-x-auto ${theme === 'dark' ? 'bg-charcoal-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>{children}</code>
                      ),
                    pre: ({ children }) => <pre className={`mb-4 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-charcoal-900' : 'bg-gray-100'}`}>{children}</pre>,
                    blockquote: ({ children }) => <blockquote className={`border-l-4 pl-4 italic mb-4 ${theme === 'dark' ? 'border-cyber-cyan text-gray-400' : 'border-cyan-500 text-gray-600'}`}>{children}</blockquote>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:underline">{children}</a>,
                    hr: () => <hr className={`my-6 ${theme === 'dark' ? 'border-charcoal-600' : 'border-gray-200'}`} />,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Nothing to preview yet...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <kbd className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>⌘</kbd>
            {' + '}
            <kbd className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>Enter</kbd>
            {' to save'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${theme === 'dark' 
                  ? 'bg-charcoal-700 hover:bg-charcoal-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
              `}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                bg-cyber-cyan hover:bg-cyber-cyan-dim text-charcoal-900
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default NoteEditorModal;
