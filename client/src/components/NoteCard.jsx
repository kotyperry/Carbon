import { useBoardStore } from '../store/boardStore';
import ReactMarkdown from 'react-markdown';

function NoteCard({ note, onEdit }) {
  const { theme, toggleNotePin, deleteNote } = useBoardStore();

  const handlePinClick = async (e) => {
    e.stopPropagation();
    await toggleNotePin(note.id);
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    await deleteNote(note.id);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Truncate content for preview
  const getPreviewContent = (content) => {
    if (!content) return '';
    // Get first 150 characters
    const truncated = content.slice(0, 150);
    return truncated.length < content.length ? truncated + '...' : truncated;
  };

  return (
    <div
      onClick={() => onEdit(note)}
      className={`
        group relative p-4 rounded-xl cursor-pointer transition-all duration-200
        ${theme === 'dark' 
          ? 'glass-card hover:border-white/15' 
          : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}
        ${note.isPinned ? 'ring-2 ring-cyber-cyan/30' : ''}
      `}
    >
      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyber-cyan rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-3 h-3 text-charcoal-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m4-2a2 2 0 012 2v2H8V4a2 2 0 012-2z" />
          </svg>
        </div>
      )}

      {/* Title */}
      <h3 className={`font-semibold text-sm mb-2 line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {note.title || 'Untitled Note'}
      </h3>

      {/* Content Preview */}
      <div className={`text-xs mb-3 line-clamp-4 prose-sm ${theme === 'dark' ? 'text-gray-400 prose-invert' : 'text-gray-600'}`}>
        <ReactMarkdown
          components={{
            // Simplify all elements for preview
            p: ({ children }) => <span>{children} </span>,
            h1: ({ children }) => <span className="font-bold">{children} </span>,
            h2: ({ children }) => <span className="font-bold">{children} </span>,
            h3: ({ children }) => <span className="font-bold">{children} </span>,
            ul: ({ children }) => <span>{children}</span>,
            ol: ({ children }) => <span>{children}</span>,
            li: ({ children }) => <span>• {children} </span>,
            code: ({ children }) => <code className="text-cyber-cyan">{children}</code>,
            a: ({ children }) => <span className="text-cyber-cyan">{children}</span>,
            strong: ({ children }) => <strong>{children}</strong>,
            em: ({ children }) => <em>{children}</em>,
          }}
        >
          {getPreviewContent(note.content)}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          {formatDate(note.updatedAt)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePinClick}
            className={`
              p-1.5 rounded-lg transition-colors
              ${note.isPinned 
                ? 'text-cyber-cyan hover:bg-cyber-cyan/20' 
                : theme === 'dark' 
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-charcoal-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
            `}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <svg className="w-4 h-4" fill={note.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className={`
              p-1.5 rounded-lg transition-colors
              ${theme === 'dark' 
                ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}
            `}
            title="Delete note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteCard;
