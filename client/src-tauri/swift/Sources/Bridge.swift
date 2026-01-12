import Foundation

// MARK: - C-compatible FFI Bridge for Rust

// MARK: - Helper Functions

private func strdup_safe(_ string: String?) -> UnsafeMutablePointer<CChar>? {
    guard let string = string else { return nil }
    return strdup(string)
}

// MARK: - Exported C Functions

/// Initialize CloudKit - call this on app startup
@_cdecl("cloudkit_init")
public func cloudkit_init() -> Bool {
    // Initialization is handled by singleton
    return true
}

/// Check if iCloud account is available
@_cdecl("cloudkit_check_account")
public func cloudkit_check_account() -> Bool {
    var result = false
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        result = await CloudKitManager.shared.checkAccountStatus()
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}

/// Get detailed iCloud account status
/// - Parameters:
///   - outStatus: Account status enum as Int32
///   - outError: Optional error/reason string (caller must free with cloudkit_free_string)
@_cdecl("cloudkit_get_account_status")
public func cloudkit_get_account_status(
    outStatus: UnsafeMutablePointer<Int32>,
    outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
    outStatus.pointee = CloudKitManager.AccountStatus.couldNotDetermine.rawValue
    outError.pointee = nil

    let semaphore = DispatchSemaphore(value: 0)

    Task {
        let (status, error) = await CloudKitManager.shared.getAccountStatus()
        outStatus.pointee = status.rawValue
        outError.pointee = strdup_safe(error)
        semaphore.signal()
    }

    semaphore.wait()
}

/// Perform a full sync operation
/// - Parameters:
///   - localData: JSON string of local app data
///   - localLastModified: ISO8601 timestamp of local data
///   - outSuccess: pointer to store success flag
///   - outShouldUpdateLocal: pointer to store whether local should be updated
///   - outError: pointer to store error string (caller must free with cloudkit_free_string)
///   - outData: pointer to store data string (caller must free with cloudkit_free_string)
///   - outRemoteLastModified: pointer to store remote timestamp (caller must free)
@_cdecl("cloudkit_sync")
public func cloudkit_sync(
    localData: UnsafePointer<CChar>,
    localLastModified: UnsafePointer<CChar>,
    outSuccess: UnsafeMutablePointer<Bool>,
    outShouldUpdateLocal: UnsafeMutablePointer<Bool>,
    outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>,
    outData: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>,
    outRemoteLastModified: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
    let dataString = String(cString: localData)
    let modifiedString = String(cString: localLastModified)
    
    // Initialize outputs
    outSuccess.pointee = false
    outShouldUpdateLocal.pointee = false
    outError.pointee = nil
    outData.pointee = nil
    outRemoteLastModified.pointee = nil
    
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        let syncResult = await SyncManager.shared.performSync(
            localData: dataString,
            localLastModified: modifiedString
        )
        
        outSuccess.pointee = syncResult.success
        outShouldUpdateLocal.pointee = syncResult.shouldUpdateLocal
        outError.pointee = strdup_safe(syncResult.error)
        outData.pointee = strdup_safe(syncResult.data)
        outRemoteLastModified.pointee = strdup_safe(syncResult.remoteLastModified)
        
        semaphore.signal()
    }
    
    semaphore.wait()
}

/// Push local data to CloudKit
@_cdecl("cloudkit_push")
public func cloudkit_push(
    data: UnsafePointer<CChar>,
    lastModified: UnsafePointer<CChar>,
    outSuccess: UnsafeMutablePointer<Bool>,
    outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
    let dataString = String(cString: data)
    let modifiedString = String(cString: lastModified)
    
    outSuccess.pointee = false
    outError.pointee = nil
    
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        let syncResult = await SyncManager.shared.pushToCloud(
            data: dataString,
            lastModified: modifiedString
        )
        
        outSuccess.pointee = syncResult.success
        outError.pointee = strdup_safe(syncResult.error)
        
        semaphore.signal()
    }
    
    semaphore.wait()
}

/// Pull data from CloudKit
@_cdecl("cloudkit_pull")
public func cloudkit_pull(
    outSuccess: UnsafeMutablePointer<Bool>,
    outShouldUpdateLocal: UnsafeMutablePointer<Bool>,
    outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>,
    outData: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>,
    outRemoteLastModified: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
    outSuccess.pointee = false
    outShouldUpdateLocal.pointee = false
    outError.pointee = nil
    outData.pointee = nil
    outRemoteLastModified.pointee = nil
    
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        let syncResult = await SyncManager.shared.pullFromCloud()
        
        outSuccess.pointee = syncResult.success
        outShouldUpdateLocal.pointee = syncResult.shouldUpdateLocal
        outError.pointee = strdup_safe(syncResult.error)
        outData.pointee = strdup_safe(syncResult.data)
        outRemoteLastModified.pointee = strdup_safe(syncResult.remoteLastModified)
        
        semaphore.signal()
    }
    
    semaphore.wait()
}

/// Get current sync status
@_cdecl("cloudkit_get_status")
public func cloudkit_get_status(
    outStatus: UnsafeMutablePointer<Int32>,
    outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
    let (status, error) = CloudKitManager.shared.getSyncStatus()
    outStatus.pointee = Int32(status)
    outError.pointee = strdup_safe(error)
}

/// Setup CloudKit subscriptions for push notifications
@_cdecl("cloudkit_setup_subscriptions")
public func cloudkit_setup_subscriptions() -> Bool {
    var result = false
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        result = await SyncManager.shared.setup()
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}

/// Free a string allocated by the Swift side
@_cdecl("cloudkit_free_string")
public func cloudkit_free_string(ptr: UnsafeMutablePointer<CChar>?) {
    if let ptr = ptr {
        free(ptr)
    }
}

/// Delete all app data from CloudKit
@_cdecl("cloudkit_delete_data")
public func cloudkit_delete_data() -> Bool {
    var result = false
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        result = await CloudKitManager.shared.deleteAppData()
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}
