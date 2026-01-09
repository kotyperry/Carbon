import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Transparent draggable region at the top of the window for macOS traffic lights.
 * Uses CSS -webkit-app-region: drag for native behavior, with JS startDragging() as primary method.
 * 
 * The drag region adjusts based on sidebar state to avoid conflicts:
 * - When sidebar is expanded (lg:w-72 = 288px), drag region starts after sidebar
 * - When sidebar is collapsed (lg:w-16 = 64px), drag region starts after collapsed width
 * - On mobile, the sidebar overlays so drag region spans full width
 * 
 * Note: Uses a low z-index (z-[2]) so content can render above it while still allowing
 * the CSS drag region and JS startDragging() to work for window movement.
 */
export function TitlebarDragRegion({ sidebarCollapsed = false }) {
  const handleMouseDown = (e) => {
    // Only respond to left mouse button
    if (e.buttons !== 1) return;
    
    // Call startDragging - this is the primary method for Tauri window dragging
    getCurrentWindow().startDragging();
  };

  // On desktop (lg+), offset the drag region to not overlap with sidebar
  // Sidebar expanded: 288px (w-72), Sidebar collapsed: 80px (w-20)
  const sidebarWidth = sidebarCollapsed ? 'lg:left-20' : 'lg:left-72';

  return (
    <div
      data-tauri-drag-region
      className={`fixed top-0 left-0 ${sidebarWidth} right-0 h-8 z-[2]`}
      onMouseDown={handleMouseDown}
    />
  );
}

export default TitlebarDragRegion;
