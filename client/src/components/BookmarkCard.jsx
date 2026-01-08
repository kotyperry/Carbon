import { useState } from 'react';
import { useBoardStore } from '../store/boardStore';

function BookmarkCard({ bookmark, onEdit }) {
  const { 
    theme, 
    toggleBookmarkFavorite, 
    archiveBookmark, 
    restoreBookmark,
    deleteBookmark,
    getBookmarkTags
  } = useBoardStore();
  
  const BOOKMARK_TAGS = getBookmarkTags();
  
  const [showMenu, setShowMenu] = useState(false);

  // Extract domain from URL
  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  // Get favicon URL
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const domain = getDomain(bookmark.url);
  const faviconUrl = bookmark.favicon || getFaviconUrl(bookmark.url);
  const tags = (bookmark.tags || []).map(key => BOOKMARK_TAGS[key]).filter(Boolean);

  const handleOpenLink = (e) => {
    e.stopPropagation();
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  const handleFavorite = async (e) => {
    e.stopPropagation();
    await toggleBookmarkFavorite(bookmark.id);
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    if (bookmark.isArchived) {
      await restoreBookmark(bookmark.id);
    } else {
      await archiveBookmark(bookmark.id);
    }
    setShowMenu(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteBookmark(bookmark.id);
    setShowMenu(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div
      onClick={handleOpenLink}
      className={`
        group p-3 rounded-lg cursor-pointer
        transition-all animate-fade-in
        ${theme === 'dark'
          ? 'bg-charcoal-600 hover:bg-charcoal-500 border border-charcoal-500 shadow-lg shadow-black/20'
          : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}
      `}
    >
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map(tag => (
            <span
              key={tag.name}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider text-white ${tag.color}`}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${theme === 'dark' ? 'bg-charcoal-500 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title and Favorite */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={`font-mono text-sm font-medium flex-1 line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {bookmark.title}
        </h4>
        {bookmark.isFavorite && (
          <span className="flex-shrink-0 text-amber-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </span>
        )}
      </div>

      {/* Description */}
      {bookmark.description && (
        <p className={`text-xs line-clamp-2 mt-1 mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
          {bookmark.description}
        </p>
      )}

      {/* Footer */}
      <div className={`flex items-center justify-between text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
        <div className="flex items-center gap-2">
          {faviconUrl && (
            <img src={faviconUrl} alt="" className="w-4 h-4 rounded" />
          )}
          <span className="font-mono truncate max-w-[120px]">{domain}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(bookmark.createdAt)}
        </div>
      </div>

      {/* Hover Actions */}
      <div className={`
        flex items-center justify-end gap-1 mt-2 pt-2 border-t
        opacity-0 group-hover:opacity-100 transition-opacity
        ${theme === 'dark' ? 'border-charcoal-500' : 'border-gray-100'}
      `}>
        <button
          onClick={handleFavorite}
          className={`p-1.5 rounded-lg transition-colors ${bookmark.isFavorite ? 'text-amber-400' : theme === 'dark' ? 'text-gray-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-500'}`}
          title={bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg className="w-4 h-4" fill={bookmark.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(bookmark);
          }}
          className={`p-1.5 rounded-lg ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={handleArchive}
          className={`p-1.5 rounded-lg ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
          title={bookmark.isArchived ? 'Restore' : 'Archive'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className={`p-1.5 rounded-lg text-red-400 hover:text-red-300`}
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default BookmarkCard;
