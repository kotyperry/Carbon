import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';

// Check for updates every 5 minutes
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const dismissedVersionRef = useRef(null);
  const hasCheckedRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    // Prevent concurrent checks
    if (isChecking) return;
    
    setIsChecking(true);
    setError(null);
    
    console.log('[Updater] Checking for updates...');
    
    try {
      const result = await invoke('check_for_updates');
      console.log('[Updater] Check result:', result);
      
      if (result.available) {
        console.log('[Updater] Update available:', result.version);
        // Only show notification if this version wasn't already dismissed
        if (dismissedVersionRef.current !== result.version) {
          setUpdateInfo(result);
          setDismissed(false);
        } else {
          console.log('[Updater] Version was previously dismissed');
        }
      } else {
        console.log('[Updater] No update available');
      }
    } catch (err) {
      console.error('[Updater] Failed to check for updates:', err);
      // Don't show error to user for automatic checks
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    // Check for updates on app startup (only once)
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Small delay to ensure app is fully loaded
      const startupTimeout = setTimeout(() => {
        checkForUpdates();
      }, 2000);
      
      return () => clearTimeout(startupTimeout);
    }
  }, [checkForUpdates]);

  useEffect(() => {
    // Set up periodic update checks every 5 minutes
    const intervalId = setInterval(() => {
      // Only check if not currently downloading and notification isn't showing
      if (!isDownloading && !updateInfo && !isChecking) {
        console.log('[Updater] Periodic check triggered');
        checkForUpdates();
      }
    }, UPDATE_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isDownloading, updateInfo, isChecking, checkForUpdates]);

  const handleUpdate = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      await invoke('install_update');
      // After successful download, prompt to restart
      await relaunch();
    } catch (err) {
      console.error('Failed to install update:', err);
      // Show the actual error message for debugging
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Unknown error';
      setError(`Failed to download update: ${errorMessage}`);
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    // Remember which version was dismissed so we don't show it again
    if (updateInfo?.version) {
      dismissedVersionRef.current = updateInfo.version;
    }
    setDismissed(true);
    setUpdateInfo(null);
  };

  // Don't show anything if no update available or dismissed
  // Note: We no longer hide during isChecking to avoid missing the notification
  if (!updateInfo || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div 
        className="bg-charcoal-800 border border-charcoal-700/50 rounded-xl p-3 flex items-center gap-3"
        style={{ boxShadow: '0 8px 32px -8px rgba(0, 212, 255, 0.25)' }}
      >
        {/* Version badge */}
        <span className="text-cyber-cyan text-xs font-medium px-2 py-0.5 bg-cyber-cyan/10 rounded-md">
          v{updateInfo.version}
        </span>

        {/* Error or Update button */}
        {error ? (
          <span className="text-red-400 text-xs">{error}</span>
        ) : (
          <button
            onClick={handleUpdate}
            disabled={isDownloading}
            className="text-xs font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDownloading ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating...</span>
              </>
            ) : (
              <span>Update & Restart</span>
            )}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors ml-1"
          disabled={isDownloading}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default UpdateNotification;
