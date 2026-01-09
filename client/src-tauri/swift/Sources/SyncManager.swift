import Foundation
import CloudKit

/// Manages synchronization logic and conflict resolution
public class SyncManager {
    public static let shared = SyncManager()
    
    private let cloudKit = CloudKitManager.shared
    private var syncTimer: Timer?
    private var isSyncing = false
    
    // Callbacks for notifying Rust side
    public var onSyncComplete: ((Bool, String?) -> Void)?
    public var onDataReceived: ((String) -> Void)?
    
    private init() {}
    
    // MARK: - Sync Operations
    
    /// Perform a full sync - push local changes and pull remote changes
    public func performSync(localData: String, localLastModified: String) async -> SyncResult {
        guard !isSyncing else {
            return SyncResult(success: false, error: "Sync already in progress", data: nil)
        }
        
        isSyncing = true
        defer { isSyncing = false }
        
        // First, fetch remote data to check for conflicts
        let (remoteData, remoteLastModified) = await cloudKit.fetchAppData()
        
        // Determine which data is newer
        if let remoteData = remoteData,
           let remoteModified = remoteLastModified,
           let remoteDate = ISO8601DateFormatter().date(from: remoteModified),
           let localDate = ISO8601DateFormatter().date(from: localLastModified) {
            
            if remoteDate > localDate {
                // Remote is newer - return remote data to update local
                return SyncResult(
                    success: true,
                    error: nil,
                    data: remoteData,
                    shouldUpdateLocal: true,
                    remoteLastModified: remoteModified
                )
            }
        }
        
        // Local is newer or no remote data - push to cloud
        let saveSuccess = await cloudKit.saveAppData(localData, lastModified: localLastModified)
        
        if saveSuccess {
            return SyncResult(success: true, error: nil, data: nil, shouldUpdateLocal: false)
        } else {
            return SyncResult(
                success: false,
                error: cloudKit.lastError ?? "Unknown error",
                data: nil
            )
        }
    }
    
    /// Pull data from cloud (for initial sync or manual refresh)
    public func pullFromCloud() async -> SyncResult {
        let (data, lastModified) = await cloudKit.fetchAppData()
        
        if let data = data {
            return SyncResult(
                success: true,
                error: nil,
                data: data,
                shouldUpdateLocal: true,
                remoteLastModified: lastModified
            )
        } else if cloudKit.currentStatus == .synced {
            // No data in cloud yet
            return SyncResult(success: true, error: nil, data: nil, shouldUpdateLocal: false)
        } else {
            return SyncResult(
                success: false,
                error: cloudKit.lastError ?? "Failed to fetch data",
                data: nil
            )
        }
    }
    
    /// Push data to cloud
    public func pushToCloud(data: String, lastModified: String) async -> SyncResult {
        let success = await cloudKit.saveAppData(data, lastModified: lastModified)
        
        return SyncResult(
            success: success,
            error: success ? nil : cloudKit.lastError,
            data: nil
        )
    }
    
    // MARK: - Auto Sync
    
    public func startAutoSync(interval: TimeInterval = 60.0) {
        stopAutoSync()
        
        syncTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            // Auto sync will be triggered by the Rust side
            // This is just a placeholder for background refresh
        }
    }
    
    public func stopAutoSync() {
        syncTimer?.invalidate()
        syncTimer = nil
    }
    
    // MARK: - Setup
    
    public func setup() async -> Bool {
        // Setup push notification subscription
        return await cloudKit.setupSubscription()
    }
}

// MARK: - Sync Result

public struct SyncResult {
    public let success: Bool
    public let error: String?
    public let data: String?
    public var shouldUpdateLocal: Bool = false
    public var remoteLastModified: String? = nil
    
    public init(
        success: Bool,
        error: String?,
        data: String?,
        shouldUpdateLocal: Bool = false,
        remoteLastModified: String? = nil
    ) {
        self.success = success
        self.error = error
        self.data = data
        self.shouldUpdateLocal = shouldUpdateLocal
        self.remoteLastModified = remoteLastModified
    }
}
