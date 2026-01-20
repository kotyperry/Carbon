import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBoardStore, BOOKMARK_TAGS, TAG_COLORS } from '../store/boardStore';

function AddBookmarkModal({ bookmark, onClose }) {
  const { theme, addBookmark, updateBookmark, collections, addCustomTag, getBookmarkTags, addCollection } = useBoardStore();
  
  const [url, setUrl] = useState(bookmark?.url || 'https://');
  const [title, setTitle] = useState(bookmark?.title || '');
  const [description, setDescription] = useState(bookmark?.description || '');
  const [selectedTags, setSelectedTags] = useState(bookmark?.tags || []);
  const [collectionId, setCollectionId] = useState(bookmark?.collectionId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New tag creation state
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [tagError, setTagError] = useState('');

  // New folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');

  const isEditing = !!bookmark;
  
  // Get current tags (this will include any newly created ones)
  const currentTags = getBookmarkTags();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isCreatingTag) {
          setIsCreatingTag(false);
          setNewTagName('');
          setTagError('');
        } else if (isCreatingFolder) {
          setIsCreatingFolder(false);
          setNewFolderName('');
          setFolderError('');
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isCreatingTag, isCreatingFolder]);

  // Auto-fetch metadata when URL changes (only for new bookmarks)
  useEffect(() => {
    if (!isEditing && url && isValidUrl(url) && !title) {
      fetchMetadata(url);
    }
  }, [url, isEditing]);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const fetchMetadata = async (targetUrl) => {
    try {
      const domain = new URL(targetUrl).hostname.replace('www.', '');
      if (!title) {
        setTitle(domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0]);
      }
    } catch {
      // Ignore errors
    }
  };

  const handleToggleTag = (tagKey) => {
    setSelectedTags(prev => 
      prev.includes(tagKey) 
        ? prev.filter(t => t !== tagKey)
        : [...prev, tagKey]
    );
  };

  const handleCreateTag = async () => {
    setTagError('');
    
    if (!newTagName.trim()) {
      setTagError('Tag name is required');
      return;
    }

    const result = await addCustomTag(newTagName.trim(), newTagColor);
    
    if (result.error) {
      setTagError(result.error);
      return;
    }

    // Auto-select the new tag
    setSelectedTags(prev => [...prev, result.key]);
    
    // Reset form
    setIsCreatingTag(false);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[0]);
  };

  const handleCreateFolder = async () => {
    setFolderError('');

    if (!newFolderName.trim()) {
      setFolderError('Folder name is required');
      return;
    }

    // Check for duplicate folder names
    if (customCollections.some(c => c.name.toLowerCase() === newFolderName.trim().toLowerCase())) {
      setFolderError('A folder with this name already exists');
      return;
    }

    try {
      const newCollection = await addCollection(newFolderName.trim());

      // Auto-select the new folder
      setCollectionId(newCollection.id);

      // Reset form
      setIsCreatingFolder(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Failed to create folder:', err);
      setFolderError('Failed to create folder');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing) {
        await updateBookmark(bookmark.id, {
          url: url.trim(),
          title: title.trim() || new URL(url).hostname,
          description: description.trim(),
          tags: selectedTags,
          collectionId,
        });
      } else {
        await addBookmark({
          url: url.trim(),
          title: title.trim() || new URL(url).hostname,
          description: description.trim(),
          tags: selectedTags,
          collectionId,
        });
      }
      onClose();
    } catch (err) {
      setError('Failed to save bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter to only custom collections
  const customCollections = collections.filter(c => c.isCustom);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in
          ${theme === 'dark' ? 'glass-modal' : 'bg-white'}
        `}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-white/10 bg-charcoal-900/80 backdrop-blur-xl' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-mono font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {isEditing ? 'Edit Bookmark' : 'Add Bookmark'}
            </h2>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          {/* URL */}
          <div>
            <label className={`block text-sm font-mono font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus={!isEditing}
              className={`
                w-full px-3 py-2 rounded-lg font-mono text-sm
                ${theme === 'dark'
                  ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
                border focus:border-cyber-cyan
              `}
            />
          </div>

          {/* Title */}
          <div>
            <label className={`block text-sm font-mono font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
              className={`
                w-full px-3 py-2 rounded-lg font-mono text-sm
                ${theme === 'dark'
                  ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
                border focus:border-cyber-cyan
              `}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-mono font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className={`
                w-full px-3 py-2 rounded-lg font-mono text-sm resize-none
                ${theme === 'dark'
                  ? 'bg-charcoal-700 border-charcoal-600 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
                border focus:border-cyber-cyan
              `}
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-mono font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Tags
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingTag(true)}
                className="flex items-center gap-1 text-xs font-mono text-cyber-cyan hover:text-cyber-cyan-dim"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Tag
              </button>
            </div>

            {/* Create Tag Form */}
            {isCreatingTag && (
              <div className={`mb-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
                <div className="space-y-3">
                  {tagError && (
                    <p className="text-xs text-red-400 font-mono">{tagError}</p>
                  )}
                  
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    autoFocus
                    className={`
                      w-full px-3 py-2 rounded-lg font-mono text-sm
                      ${theme === 'dark'
                        ? 'bg-charcoal-600 border-charcoal-500 text-white placeholder-gray-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}
                      border focus:border-cyber-cyan
                    `}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTag();
                      }
                    }}
                  />
                  
                  {/* Color Picker */}
                  <div>
                    <p className={`text-xs font-mono mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Choose color:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`
                            w-6 h-6 rounded-full ${color} transition-transform
                            ${newTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-charcoal-700 scale-110' : 'hover:scale-110'}
                          `}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {newTagName && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Preview:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium text-white ${newTagColor}`}>
                        {newTagName}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      className="flex-1 px-3 py-1.5 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim"
                    >
                      Create Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTagName('');
                        setTagError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-sm ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-200'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentTags).map(([key, tag]) => {
                const isSelected = selectedTags.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleTag(key)}
                    className={`
                      px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all
                      ${isSelected 
                        ? `${tag.color} text-white ring-2 ring-offset-1 ${theme === 'dark' ? 'ring-offset-charcoal-800' : 'ring-offset-white'} ring-white/30` 
                        : theme === 'dark' 
                          ? 'bg-charcoal-700 text-gray-400 hover:bg-charcoal-600' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                    `}
                  >
                    {isSelected && '✓ '}{tag.name}
                  </button>
                );
              })}
              {Object.keys(currentTags).length === 0 && (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  No tags yet. Create one above!
                </p>
              )}
            </div>
          </div>

          {/* Folder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-mono font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Folder
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center gap-1 text-xs font-mono text-cyber-cyan hover:text-cyber-cyan-dim"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </button>
            </div>

            {/* Create Folder Form */}
            {isCreatingFolder && (
              <div className={`mb-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
                <div className="space-y-3">
                  {folderError && (
                    <p className="text-xs text-red-400 font-mono">{folderError}</p>
                  )}

                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    autoFocus
                    className={`
                      w-full px-3 py-2 rounded-lg font-mono text-sm
                      ${theme === 'dark'
                        ? 'bg-charcoal-600 border-charcoal-500 text-white placeholder-gray-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}
                      border focus:border-cyber-cyan
                    `}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateFolder();
                      }
                    }}
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="flex-1 px-3 py-1.5 bg-cyber-cyan text-charcoal-900 rounded-lg font-mono text-sm font-medium hover:bg-cyber-cyan-dim"
                    >
                      Create Folder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(false);
                        setNewFolderName('');
                        setFolderError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-sm ${theme === 'dark' ? 'hover:bg-charcoal-600' : 'hover:bg-gray-200'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <select
              value={collectionId || ''}
              onChange={(e) => setCollectionId(e.target.value || null)}
              className={`
                w-full px-3 py-2 rounded-lg font-mono text-sm cursor-pointer
                ${theme === 'dark'
                  ? 'bg-charcoal-700 border-charcoal-600 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-900'}
                border focus:border-cyber-cyan
              `}
            >
              <option value="">No folder</option>
              {customCollections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            {customCollections.length === 0 && !isCreatingFolder && (
              <p className={`mt-1.5 text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                No folders yet. Create one to organize your bookmarks!
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${theme === 'dark' ? 'border-charcoal-700' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`
              px-4 py-2 rounded-lg font-mono text-sm font-medium transition-colors
              ${theme === 'dark' ? 'text-gray-400 hover:bg-charcoal-700 hover:text-white' : 'text-gray-600 hover:bg-gray-100'}
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !url.trim()}
            className={`
              px-4 py-2 rounded-lg font-mono text-sm font-medium transition-colors
              bg-cyber-cyan text-charcoal-900 hover:bg-cyber-cyan-dim
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            `}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Bookmark'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AddBookmarkModal;
