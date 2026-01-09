import { useEffect, useCallback } from 'react';

/**
 * Custom hook for handling keyboard hotkeys
 * @param {Object} keyMap - Object mapping key combinations to callbacks
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether hotkeys are enabled (default: true)
 * @param {boolean} options.enableOnFormTags - Enable hotkeys when focused on form elements (default: false)
 */
export function useHotkeys(keyMap, options = {}) {
  const { enabled = true, enableOnFormTags = false } = options;

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Skip if focused on form elements (unless explicitly enabled)
    if (!enableOnFormTags) {
      const target = event.target;
      const tagName = target.tagName.toLowerCase();
      const isFormElement = ['input', 'textarea', 'select'].includes(tagName);
      const isContentEditable = target.isContentEditable;
      
      if (isFormElement || isContentEditable) {
        return;
      }
    }

    // Build the key combination string
    const parts = [];
    if (event.metaKey || event.ctrlKey) parts.push('mod');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    // Normalize key
    let key = event.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    
    parts.push(key);
    const combo = parts.join('+');

    // Check for matching hotkey
    for (const [hotkey, callback] of Object.entries(keyMap)) {
      const normalizedHotkey = hotkey.toLowerCase().replace(/\s/g, '');
      
      // Handle multiple key options (e.g., "1, mod+1")
      const keyOptions = normalizedHotkey.split(',').map(k => k.trim());
      
      for (const keyOption of keyOptions) {
        if (combo === keyOption || key === keyOption) {
          event.preventDefault();
          callback(event);
          return;
        }
      }
    }
  }, [keyMap, enabled, enableOnFormTags]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Predefined hotkey configurations for the app
 */
export const HOTKEYS = {
  // View navigation
  BOARDS: '1',
  BOOKMARKS: '2',
  NOTES: '3',
  
  // Common actions
  NEW_ITEM: 'n',
  SEARCH: '/',
  TOGGLE_SIDEBAR: '[',
  TOGGLE_THEME: 't',
  
  // Navigation
  ESCAPE: 'esc',
};

export default useHotkeys;
