import { useEffect, useState, useRef } from 'react';
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

  useEffect(() => {
    // Check for updates on app startup
    checkForUpdates();

    // Set up periodic update checks every 5 minutes
    const intervalId = setInterval(() => {
      // Only check if not currently downloading and notification isn't showing
      if (!isDownloading && !updateInfo) {
        checkForUpdates();
      }
    }, UPDATE_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isDownloading, updateInfo]);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await invoke('check_for_updates');
      if (result.available) {
        // Only show notification if this version wasn't already dismissed
        if (dismissedVersionRef.current !== result.version) {
          setUpdateInfo(result);
          setDismissed(false);
        }
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      // Don't show error to user for automatic checks
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      await invoke('install_update');
      // After successful download, prompt to restart
      await relaunch();
    } catch (err) {
      console.error('Failed to install update:', err);
      setError('Failed to download update. Please try again.');
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

  // Don't show anything if no update available, dismissed, or checking
  if (!updateInfo || dismissed || isChecking) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl shadow-2xl p-5 max-w-sm">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-cyber-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Update Available</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Version {updateInfo.version} is ready to install
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 -m-1"
            disabled={isDownloading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Release notes */}
        {updateInfo.body && (
          <div className="mb-4 p-3 bg-charcoal-900/50 rounded-xl">
            <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
              {updateInfo.body}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            disabled={isDownloading}
            className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-xl hover:bg-charcoal-700 transition-colors disabled:opacity-50"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            disabled={isDownloading}
            className="flex-1 px-4 py-2.5 bg-cyber-cyan text-charcoal-900 text-sm font-semibold rounded-xl hover:bg-cyber-cyan-dim transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </>
            ) : (
              <>
                Update & Restart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
