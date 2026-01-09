import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Transparent draggable region at the top of the window for macOS traffic lights.
 * Uses CSS -webkit-app-region: drag for native behavior, with JS startDragging() as primary method.
 * 
 * Note: Uses a low z-index (z-[2]) so content can render above it while still allowing
 * the CSS drag region and JS startDragging() to work for window movement.
 */
export function TitlebarDragRegion() {
  const handleMouseDown = (e) => {
    // Only respond to left mouse button
    if (e.buttons !== 1) return;
    
    // Call startDragging - this is the primary method for Tauri window dragging
    getCurrentWindow().startDragging();
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-8 z-[2]"
      onMouseDown={handleMouseDown}
    />
  );
}

export default TitlebarDragRegion;
