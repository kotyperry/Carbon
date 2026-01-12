use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_updater::UpdaterExt;

// CloudKit module for iCloud sync (macOS only)
#[cfg(target_os = "macos")]
mod cloudkit;

#[cfg(target_os = "macos")]
use cloudkit::{AccountStatusJson, CloudKit, SyncResultJson, SyncStatusJson};

// Data structures matching the JavaScript types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChecklistItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub checklist: Vec<ChecklistItem>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "archivedAt", default)]
    pub archived_at: Option<String>,
    #[serde(rename = "originalColumnId", default)]
    pub original_column_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub id: String,
    pub title: String,
    pub cards: Vec<Card>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Board {
    pub id: String,
    pub name: String,
    pub columns: Vec<Column>,
    #[serde(rename = "archivedCards", default)]
    pub archived_cards: Vec<Card>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub icon: String,
    #[serde(rename = "isCustom", default)]
    pub is_custom: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bookmark {
    pub id: String,
    pub title: String,
    pub url: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub favicon: Option<String>,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "collectionId", default)]
    pub collection_id: Option<String>,
    #[serde(rename = "isFavorite", default)]
    pub is_favorite: bool,
    #[serde(rename = "isArchived", default)]
    pub is_archived: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomTag {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(rename = "isPinned", default)]
    pub is_pinned: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppData {
    pub boards: Vec<Board>,
    #[serde(rename = "activeBoard")]
    pub active_board: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(rename = "activeView", default = "default_view")]
    pub active_view: String,
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    #[serde(default = "default_collections")]
    pub collections: Vec<Collection>,
    #[serde(rename = "customTags", default)]
    pub custom_tags: std::collections::HashMap<String, CustomTag>,
    #[serde(default)]
    pub notes: Vec<Note>,
    /// Last modified timestamp for sync conflict resolution (ISO 8601)
    #[serde(rename = "lastModified", default = "default_last_modified")]
    pub last_modified: String,
    /// Whether iCloud sync is enabled
    #[serde(rename = "syncEnabled", default)]
    pub sync_enabled: bool,
}

/// Data that is synced across devices via CloudKit.
/// Intentionally excludes purely local UI state like `activeView`.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncData {
    pub boards: Vec<Board>,
    #[serde(rename = "activeBoard")]
    pub active_board: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    #[serde(default = "default_collections")]
    pub collections: Vec<Collection>,
    #[serde(rename = "customTags", default)]
    pub custom_tags: std::collections::HashMap<String, CustomTag>,
    #[serde(default)]
    pub notes: Vec<Note>,
    /// Last modified timestamp for sync conflict resolution (ISO 8601)
    #[serde(rename = "lastModified", default = "default_last_modified")]
    pub last_modified: String,
    /// Whether iCloud sync is enabled
    #[serde(rename = "syncEnabled", default)]
    pub sync_enabled: bool,
}

fn default_last_modified() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_view() -> String {
    "boards".to_string()
}

fn default_collections() -> Vec<Collection> {
    vec![
        Collection {
            id: "all".to_string(),
            name: "All Bookmarks".to_string(),
            icon: "bookmark".to_string(),
            is_custom: None,
        },
        Collection {
            id: "favorites".to_string(),
            name: "Favorites".to_string(),
            icon: "star".to_string(),
            is_custom: None,
        },
        Collection {
            id: "archive".to_string(),
            name: "Archive".to_string(),
            icon: "archive".to_string(),
            is_custom: None,
        },
    ]
}

fn get_data_dir() -> PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("carbon");
    
    // Create directory if it doesn't exist
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).ok();
    }
    
    data_dir
}

fn get_data_file_path() -> PathBuf {
    get_data_dir().join("boards.json")
}

fn get_default_data() -> AppData {
    AppData {
        boards: vec![Board {
            id: "default-board".to_string(),
            name: "My First Project".to_string(),
            columns: vec![
                Column {
                    id: "col-backlog".to_string(),
                    title: "Backlog".to_string(),
                    cards: vec![Card {
                        id: "card-1".to_string(),
                        title: "Welcome!".to_string(),
                        description: "This is your first card. Drag it to another column or create new cards to get started.".to_string(),
                        labels: vec![],
                        priority: None,
                        checklist: vec![],
                        created_at: chrono::Utc::now().to_rfc3339(),
                        archived_at: None,
                        original_column_id: None,
                    }],
                },
                Column {
                    id: "col-todo".to_string(),
                    title: "To Do".to_string(),
                    cards: vec![],
                },
                Column {
                    id: "col-progress".to_string(),
                    title: "In Progress".to_string(),
                    cards: vec![],
                },
                Column {
                    id: "col-done".to_string(),
                    title: "Done".to_string(),
                    cards: vec![],
                },
            ],
            archived_cards: vec![],
        }],
        active_board: Some("default-board".to_string()),
        theme: "dark".to_string(),
        active_view: "boards".to_string(),
        bookmarks: vec![],
        collections: default_collections(),
        custom_tags: std::collections::HashMap::new(),
        notes: vec![],
        last_modified: chrono::Utc::now().to_rfc3339(),
        sync_enabled: false,
    }
}

#[tauri::command]
fn read_data() -> Result<AppData, String> {
    let file_path = get_data_file_path();
    
    if !file_path.exists() {
        // Return default data if file doesn't exist
        let default_data = get_default_data();
        // Also save it for next time
        if let Ok(json) = serde_json::to_string_pretty(&default_data) {
            fs::write(&file_path, json).ok();
        }
        return Ok(default_data);
    }
    
    match fs::read_to_string(&file_path) {
        Ok(content) => {
            match serde_json::from_str::<AppData>(&content) {
                Ok(data) => Ok(data),
                Err(e) => {
                    log::error!("Failed to parse data file: {}", e);
                    // Return default data if parsing fails
                    Ok(get_default_data())
                }
            }
        }
        Err(e) => {
            log::error!("Failed to read data file: {}", e);
            Ok(get_default_data())
        }
    }
}

#[tauri::command]
fn write_data(data: AppData) -> Result<bool, String> {
    let file_path = get_data_file_path();
    
    match serde_json::to_string_pretty(&data) {
        Ok(json) => {
            match fs::write(&file_path, json) {
                Ok(_) => Ok(true),
                Err(e) => {
                    log::error!("Failed to write data file: {}", e);
                    Err(format!("Failed to write data: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to serialize data: {}", e);
            Err(format!("Failed to serialize data: {}", e))
        }
    }
}

#[tauri::command]
fn get_data_path() -> String {
    get_data_file_path().to_string_lossy().to_string()
}

// Update check response structure
#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            // Filter out the "See the assets below" text from the release body
            let filtered_body = update.body.clone().map(|body| {
                body.lines()
                    .filter(|line| !line.trim().starts_with("See the assets below"))
                    .collect::<Vec<_>>()
                    .join("\n")
                    .trim()
                    .to_string()
            }).filter(|s| !s.is_empty());
            
            Ok(UpdateInfo {
                available: true,
                version: Some(update.version.clone()),
                body: filtered_body,
            })
        }
        Ok(None) => {
            Ok(UpdateInfo {
                available: false,
                version: None,
                body: None,
            })
        }
        Err(e) => {
            log::error!("Failed to check for updates: {}", e);
            Err(format!("Failed to check for updates: {}", e))
        }
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting update installation...");
    
    let updater = app.updater().map_err(|e| {
        log::error!("Failed to get updater: {}", e);
        format!("Updater initialization failed: {}", e)
    })?;
    
    log::info!("Checking for available update...");
    
    match updater.check().await {
        Ok(Some(update)) => {
            log::info!("Update found: version {}", update.version);
            log::info!("Download URL: {:?}", update.download_url);
            
            // Download and install the update
            let mut downloaded = 0;
            
            update.download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("Downloaded {} of {:?}", downloaded, content_length);
                },
                || {
                    log::info!("Download finished, preparing to install...");
                },
            ).await.map_err(|e| {
                log::error!("Download/install failed: {}", e);
                format!("Download failed: {}", e)
            })?;
            
            log::info!("Update installed successfully");
            Ok(())
        }
        Ok(None) => {
            log::warn!("No update available when trying to install");
            Err("No update available".to_string())
        }
        Err(e) => {
            log::error!("Update check failed during install: {}", e);
            Err(format!("Update check failed: {}", e))
        }
    }
}

// ============================================
// CLOUDKIT SYNC COMMANDS (macOS only)
// ============================================

/// Check if iCloud account is available
#[tauri::command]
#[cfg(target_os = "macos")]
fn check_icloud_account() -> bool {
    CloudKit::check_account()
}

/// Get detailed iCloud account status (for better UI + debugging)
#[tauri::command]
#[cfg(target_os = "macos")]
fn get_icloud_account_status() -> AccountStatusJson {
    CloudKit::get_account_status().into()
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn check_icloud_account() -> bool {
    false
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn get_icloud_account_status() -> serde_json::Value {
    serde_json::json!({
        "available": false,
        "status": "offline",
        "error": "CloudKit is only available on macOS"
    })
}

/// Get current sync status
#[tauri::command]
#[cfg(target_os = "macos")]
fn get_sync_status() -> SyncStatusJson {
    CloudKit::get_status().into()
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn get_sync_status() -> serde_json::Value {
    serde_json::json!({
        "status": "offline",
        "error": "CloudKit is only available on macOS"
    })
}

/// Sync data with iCloud - performs bidirectional sync with last-write-wins conflict resolution
#[tauri::command]
#[cfg(target_os = "macos")]
async fn sync_to_cloud(data: SyncData) -> Result<SyncResultJson, String> {
    log::debug!("Starting iCloud sync...");

    // Serialize the data to JSON
    let json_data = serde_json::to_string(&data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    let last_modified = data.last_modified.clone();

    // CloudKit FFI blocks; run it on a blocking thread to avoid UI / event loop stalls.
    let result = tauri::async_runtime::spawn_blocking(move || CloudKit::sync(&json_data, &last_modified))
        .await
        .map_err(|e| format!("Sync task failed: {}", e))?;

    if !result.success {
        log::error!("iCloud sync failed: {:?}", result.error);
    }

    Ok(result.into())
}

/// Push local data to iCloud (upload only).
///
/// This avoids an extra fetch that `sync_to_cloud` performs, and only falls back
/// to a pull if the server reports newer data (CAS conflict).
#[tauri::command]
#[cfg(target_os = "macos")]
async fn push_to_cloud(data: SyncData) -> Result<SyncResultJson, String> {
    log::debug!("Pushing local data to iCloud...");

    let json_data = serde_json::to_string(&data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    let last_modified = data.last_modified.clone();

    let result = tauri::async_runtime::spawn_blocking(move || CloudKit::push(&json_data, &last_modified))
        .await
        .map_err(|e| format!("Push task failed: {}", e))?;

    if result.success {
        return Ok(result.into());
    }

    // If the server has newer data, pull it so the frontend can update local state.
    if let Some(err) = result.error.as_deref() {
        let err_lc = err.to_lowercase();
        if err_lc.contains("cas failed") || err_lc.contains("server has newer data") {
            log::debug!("Push conflicted; pulling latest remote data...");
            let pull = tauri::async_runtime::spawn_blocking(|| CloudKit::pull())
                .await
                .map_err(|e| format!("Pull task failed: {}", e))?;
            return Ok(pull.into());
        }
    }

    Ok(result.into())
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn push_to_cloud(_data: SyncData) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": false,
        "shouldUpdateLocal": false,
        "error": "CloudKit is only available on macOS",
        "data": null,
        "remoteLastModified": null
    }))
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn sync_to_cloud(_data: SyncData) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": false,
        "shouldUpdateLocal": false,
        "error": "CloudKit is only available on macOS",
        "data": null,
        "remoteLastModified": null
    }))
}

/// Pull data from iCloud
#[tauri::command]
#[cfg(target_os = "macos")]
async fn sync_from_cloud() -> Result<SyncResultJson, String> {
    log::debug!("Pulling data from iCloud...");

    let result = tauri::async_runtime::spawn_blocking(|| CloudKit::pull())
        .await
        .map_err(|e| format!("Pull task failed: {}", e))?;

    if !result.success {
        log::error!("Failed to pull from iCloud: {:?}", result.error);
    }

    Ok(result.into())
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn sync_from_cloud() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": false,
        "shouldUpdateLocal": false,
        "error": "CloudKit is only available on macOS",
        "data": null,
        "remoteLastModified": null
    }))
}

/// Initialize CloudKit and setup subscriptions
#[tauri::command]
#[cfg(target_os = "macos")]
fn init_cloudkit() -> bool {
    log::info!("Initializing CloudKit...");
    
    if !CloudKit::init() {
        log::error!("Failed to initialize CloudKit");
        return false;
    }
    
    if !CloudKit::setup_subscriptions() {
        log::warn!("Failed to setup CloudKit subscriptions");
        // Don't fail completely, subscriptions are optional
    }
    
    log::info!("CloudKit initialized successfully");
    true
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn init_cloudkit() -> bool {
    false
}

/// Delete all data from iCloud (for testing/reset purposes)
#[tauri::command]
#[cfg(target_os = "macos")]
fn delete_cloud_data() -> bool {
    log::info!("Deleting data from iCloud...");
    CloudKit::delete_data()
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
fn delete_cloud_data() -> bool {
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Enable logging in both debug and release builds for troubleshooting
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    })
                    .build(),
            )?;
            
            // Log the data directory location
            log::info!("Data directory: {:?}", get_data_dir());
            
            // Initialize CloudKit on macOS
            #[cfg(all(target_os = "macos", not(debug_assertions)))]
            {
                log::info!("Initializing CloudKit for iCloud sync...");
                if CloudKit::init() {
                    log::info!("CloudKit initialized successfully");
                } else {
                    log::warn!("CloudKit initialization failed - iCloud sync will be unavailable");
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_data, 
            write_data, 
            get_data_path,
            check_for_updates,
            install_update,
            // CloudKit sync commands
            check_icloud_account,
            get_icloud_account_status,
            get_sync_status,
            sync_to_cloud,
            push_to_cloud,
            sync_from_cloud,
            init_cloudkit,
            delete_cloud_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
