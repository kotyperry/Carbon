import Foundation
import CloudKit

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
    
    public func checkAccountStatus() async -> Bool {
        do {
            let status = try await container.accountStatus()
            switch status {
            case .available:
                return true
            case .noAccount, .restricted, .couldNotDetermine, .temporarilyUnavailable:
                return false
            @unknown default:
                return false
            }
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Save Operations
    
    /// Save the entire app data as a single record
    public func saveAppData(_ jsonData: String, lastModified: String) async -> Bool {
        currentStatus = .syncing
        
        do {
            // Check account status first
            guard await checkAccountStatus() else {
                currentStatus = .offline
                lastError = "iCloud account not available"
                return false
            }
            
            let recordID = CKRecord.ID(recordName: "carbon-app-data")
            
            // Try to fetch existing record first
            var record: CKRecord
            do {
                record = try await privateDatabase.record(for: recordID)
            } catch {
                // Record doesn't exist, create new one
                record = CKRecord(recordType: appDataRecordType, recordID: recordID)
            }
            
            // Check for conflicts using last modified timestamp
            if let existingModified = record["lastModified"] as? String,
               let existingDate = ISO8601DateFormatter().date(from: existingModified),
               let newDate = ISO8601DateFormatter().date(from: lastModified) {
                // Last write wins - only save if our data is newer
                if existingDate > newDate {
                    currentStatus = .synced
                    return true // Server has newer data, don't overwrite
                }
            }
            
            record["data"] = jsonData as CKRecordValue
            record["lastModified"] = lastModified as CKRecordValue
            
            _ = try await privateDatabase.save(record)
            currentStatus = .synced
            lastError = nil
            return true
        } catch {
            currentStatus = .error
            lastError = error.localizedDescription
            print("CloudKit save error: \(error)")
            return false
        }
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
