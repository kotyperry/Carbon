import Foundation
import CloudKit

private func parseISO8601(_ s: String) -> Date? {
    let withFractional = ISO8601DateFormatter()
    withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = withFractional.date(from: s) {
        return d
    }
    let withoutFractional = ISO8601DateFormatter()
    withoutFractional.formatOptions = [.withInternetDateTime]
    return withoutFractional.date(from: s)
}

private func ckErrorSummary(_ error: CKError) -> String {
    // Include code + retryAfter if available (helps debugging + retry logic)
    var parts: [String] = []
    parts.append("CloudKit error: \(error.code.rawValue)")
    parts.append(error.localizedDescription)
    if let retry = error.userInfo[CKErrorRetryAfterKey] as? NSNumber {
        parts.append("retryAfter=\(retry)")
    }
    return parts.joined(separator: " · ")
}

/// Manages all CloudKit operations for Carbon app
public class CloudKitManager {
    public static let shared = CloudKitManager()
    
    private let containerIdentifier = "iCloud.dev.blkdog.carbon"
    private var container: CKContainer
    private var privateDatabase: CKDatabase
    
    // Record types
    private let boardRecordType = "Board"
    private let bookmarkRecordType = "Bookmark"
    private let noteRecordType = "Note"
    private let appDataRecordType = "AppData"
    
    // Change tokens for incremental sync
    private var serverChangeToken: CKServerChangeToken?
    private let changeTokenKey = "CarbonCloudKitChangeToken"
    
    // Sync status
    public enum SyncStatus: Int {
        case idle = 0
        case syncing = 1
        case synced = 2
        case error = 3
        case offline = 4
    }
    
    public private(set) var currentStatus: SyncStatus = .idle
    public private(set) var lastError: String?
    
    private init() {
        container = CKContainer(identifier: containerIdentifier)
        privateDatabase = container.privateCloudDatabase
        loadChangeToken()
    }
    
    // MARK: - Change Token Management
    
    private func loadChangeToken() {
        if let tokenData = UserDefaults.standard.data(forKey: changeTokenKey) {
            do {
                serverChangeToken = try NSKeyedUnarchiver.unarchivedObject(
                    ofClass: CKServerChangeToken.self,
                    from: tokenData
                )
            } catch {
                print("Failed to load change token: \(error)")
            }
        }
    }
    
    private func saveChangeToken(_ token: CKServerChangeToken?) {
        guard let token = token else {
            UserDefaults.standard.removeObject(forKey: changeTokenKey)
            return
        }
        
        do {
            let data = try NSKeyedArchiver.archivedData(
                withRootObject: token,
                requiringSecureCoding: true
            )
            UserDefaults.standard.set(data, forKey: changeTokenKey)
            serverChangeToken = token
        } catch {
            print("Failed to save change token: \(error)")
        }
    }
    
    // MARK: - Account Status

    public enum AccountStatus: Int32 {
        case available = 0
        case noAccount = 1
        case restricted = 2
        case couldNotDetermine = 3
        case temporarilyUnavailable = 4
        case error = 5
    }

    public func getAccountStatus() async -> (status: AccountStatus, error: String?) {
        do {
            let status = try await container.accountStatus()
            switch status {
            case .available:
                lastError = nil
                return (.available, nil)
            case .noAccount:
                lastError = "No iCloud account is signed in."
                return (.noAccount, lastError)
            case .restricted:
                lastError = "iCloud is restricted for this account."
                return (.restricted, lastError)
            case .couldNotDetermine:
                lastError = "Could not determine iCloud account status."
                return (.couldNotDetermine, lastError)
            case .temporarilyUnavailable:
                lastError = "iCloud is temporarily unavailable."
                return (.temporarilyUnavailable, lastError)
            @unknown default:
                lastError = "Unknown iCloud account status."
                return (.couldNotDetermine, lastError)
            }
        } catch {
            lastError = error.localizedDescription
            return (.error, lastError)
        }
    }
    
    public func checkAccountStatus() async -> Bool {
        let (status, _) = await getAccountStatus()
        return status == .available
    }
    
    // MARK: - Save Operations
    
    /// Save the entire app data as a single record
    public func saveAppData(_ jsonData: String, lastModified: String) async -> Bool {
        currentStatus = .syncing
        
        // Check account status first
        guard await checkAccountStatus() else {
            currentStatus = .offline
            lastError = "iCloud account not available"
            return false
        }

        let recordID = CKRecord.ID(recordName: "carbon-app-data")
        let maxAttempts = 3

        for attempt in 1...maxAttempts {
            do {
                // Try to fetch existing record first
                let record: CKRecord
                do {
                    record = try await privateDatabase.record(for: recordID)
                } catch {
                    // Record doesn't exist, create new one
                    record = CKRecord(recordType: appDataRecordType, recordID: recordID)
                }

                // Check for conflicts using last modified timestamp
                if let existingModified = record["lastModified"] as? String,
                   let existingDate = parseISO8601(existingModified),
                   let newDate = parseISO8601(lastModified) {
                    // Last write wins - only save if our data is newer
                    if existingDate > newDate {
                        currentStatus = .error
                        lastError = "CAS failed: server has newer data"
                        return false
                    }
                }

                record["data"] = jsonData as CKRecordValue
                record["lastModified"] = lastModified as CKRecordValue

                _ = try await privateDatabase.save(record)
                currentStatus = .synced
                lastError = nil
                return true
            } catch let error as CKError {
                // Handle CAS / record changed conflict
                if error.code == .serverRecordChanged {
                    // Another device updated between fetch and save; retry by looping.
                    lastError = "CAS failed: server record changed"
                    if attempt < maxAttempts {
                        continue
                    }
                    currentStatus = .error
                    return false
                }

                // Retry transient failures using retryAfter if provided
                if let retry = error.userInfo[CKErrorRetryAfterKey] as? NSNumber,
                   attempt < maxAttempts {
                    let seconds = max(0.5, retry.doubleValue)
                    try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                    continue
                }

                currentStatus = .error
                lastError = ckErrorSummary(error)
                return false
            } catch {
                currentStatus = .error
                lastError = error.localizedDescription
                return false
            }
        }

        currentStatus = .error
        lastError = "CloudKit save failed"
        return false
    }
    
    // MARK: - Fetch Operations
    
    /// Fetch the app data from CloudKit
    public func fetchAppData() async -> (data: String?, lastModified: String?) {
        currentStatus = .syncing
        
        do {
            guard await checkAccountStatus() else {
                currentStatus = .offline
                lastError = "iCloud account not available"
                return (nil, nil)
            }
            
            let recordID = CKRecord.ID(recordName: "carbon-app-data")
            let record = try await privateDatabase.record(for: recordID)
            
            let data = record["data"] as? String
            let lastModified = record["lastModified"] as? String
            
            currentStatus = .synced
            lastError = nil
            return (data, lastModified)
        } catch let error as CKError {
            if error.code == .unknownItem {
                // No data exists yet, this is fine
                currentStatus = .synced
                return (nil, nil)
            }
            currentStatus = .error
            lastError = error.localizedDescription
            return (nil, nil)
        } catch {
            currentStatus = .error
            lastError = error.localizedDescription
            return (nil, nil)
        }
    }
    
    // MARK: - Subscriptions for Push Notifications
    
    public func setupSubscription() async -> Bool {
        do {
            let subscriptionID = "carbon-app-data-changes"
            
            // Check if subscription already exists
            do {
                _ = try await privateDatabase.subscription(for: subscriptionID)
                return true // Already subscribed
            } catch {
                // Subscription doesn't exist, create it
            }
            
            let predicate = NSPredicate(value: true)
            let subscription = CKQuerySubscription(
                recordType: appDataRecordType,
                predicate: predicate,
                subscriptionID: subscriptionID,
                options: [.firesOnRecordCreation, .firesOnRecordUpdate]
            )
            
            let notificationInfo = CKSubscription.NotificationInfo()
            notificationInfo.shouldSendContentAvailable = true
            subscription.notificationInfo = notificationInfo
            
            _ = try await privateDatabase.save(subscription)
            return true
        } catch {
            print("Failed to setup subscription: \(error)")
            return false
        }
    }
    
    // MARK: - Delete Operations
    
    public func deleteAppData() async -> Bool {
        do {
            let recordID = CKRecord.ID(recordName: "carbon-app-data")
            try await privateDatabase.deleteRecord(withID: recordID)
            return true
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Sync Status
    
    public func getSyncStatus() -> (status: Int, error: String?) {
        return (currentStatus.rawValue, lastError)
    }
}
