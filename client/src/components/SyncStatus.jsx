import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';

// Icons
const CloudIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const CloudOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const SyncIcon = ({ spinning }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function SyncStatus() {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const {
    syncEnabled,
    syncStatus,
    syncError,
    lastModified,
    iCloudAvailable,
    toggleSyncEnabled,
    performSync,
    pullFromCloud,
  } = useBoardStore();

  // Don't render if not on macOS (check via iCloudAvailable being checked)
  // We'll show the component but indicate unavailability
  
  const getStatusColor = () => {
    if (!iCloudAvailable) return 'text-neutral-500';
    if (!syncEnabled) return 'text-neutral-500';
    switch (syncStatus) {
      case 'syncing': return 'text-blue-400';
      case 'synced': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'offline': return 'text-amber-400';
      default: return 'text-neutral-400';
    }
  };

  const getStatusIcon = () => {
    if (!iCloudAvailable) return <CloudOffIcon />;
    if (!syncEnabled) return <CloudOffIcon />;
    switch (syncStatus) {
      case 'syncing': return <SyncIcon spinning />;
      case 'synced': return <CheckIcon />;
      case 'error': return <AlertIcon />;
      case 'offline': return <CloudOffIcon />;
      default: return <CloudIcon />;
    }
  };

  const getStatusText = () => {
    if (!iCloudAvailable) return 'iCloud unavailable';
    if (!syncEnabled) return 'Sync disabled';
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Synced';
      case 'error': return 'Sync error';
      case 'offline': return 'Offline';
      default: return 'Ready';
    }
  };

  const formatLastModified = () => {
    if (!lastModified) return 'Never';
    const date = new Date(lastModified);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors
          hover:bg-neutral-800/50 ${getStatusColor()}`}
        title={`iCloud Sync: ${getStatusText()}`}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-neutral-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-200">iCloud Sync</span>
                <button
                  onClick={toggleSyncEnabled}
                  disabled={!iCloudAvailable}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                    ${syncEnabled && iCloudAvailable ? 'bg-blue-500' : 'bg-neutral-600'}
                    ${!iCloudAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                      ${syncEnabled && iCloudAvailable ? 'translate-x-4.5' : 'translate-x-1'}`}
                    style={{ transform: syncEnabled && iCloudAvailable ? 'translateX(18px)' : 'translateX(4px)' }}
                  />
                </button>
              </div>
              
              {!iCloudAvailable && (
                <p className="text-xs text-amber-400">
                  Sign in to iCloud in System Settings to enable sync.
                </p>
              )}
              
              {iCloudAvailable && syncEnabled && (
                <p className="text-xs text-neutral-400">
                  Your data syncs automatically across all your devices.
                </p>
              )}
            </div>

            {syncEnabled && iCloudAvailable && (
              <>
                <div className="p-3 border-b border-neutral-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Status</span>
                    <span className={getStatusColor()}>{getStatusText()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-neutral-400">Last sync</span>
                    <span className="text-neutral-300">{formatLastModified()}</span>
                  </div>
                  {syncError && (
                    <p className="text-xs text-red-400 mt-2">{syncError}</p>
                  )}
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      performSync();
                      setShowDropdown(false);
                    }}
                    disabled={syncStatus === 'syncing'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    <SyncIcon spinning={syncStatus === 'syncing'} />
                    Sync Now
                  </button>
                  <button
                    onClick={() => {
                      pullFromCloud();
                      setShowDropdown(false);
                    }}
                    disabled={syncStatus === 'syncing'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CloudIcon />
                    Pull from iCloud
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
