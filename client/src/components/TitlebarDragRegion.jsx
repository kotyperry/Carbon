import { useEffect, useRef } from 'react';

// Module-level cache for the Tauri window API
let tauriWindow = null;

/**
 * Transparent draggable region at the top of the window for macOS traffic lights.
 * Uses CSS -webkit-app-region: drag for native behavior, with JS startDragging() as backup.
 */
export function TitlebarDragRegion() {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Try to load the Tauri window module
    import('@tauri-apps/api/window')
      .then((mod) => {
        tauriWindow = mod;
      })
      .catch(() => {
        // Not in Tauri environment - that's fine, CSS will still work in browser
      });
  }, []);

  const handleMouseDown = (e) => {
    // Only respond to left mouse button
    if (e.buttons !== 1) return;
    
    // Call startDragging if available
    if (tauriWindow) {
      tauriWindow.getCurrentWindow().startDragging();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-10 z-[60]"
      onMouseDown={handleMouseDown}
    />
  );
}

export default TitlebarDragRegion;
