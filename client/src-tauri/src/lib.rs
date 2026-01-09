use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

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
            Ok(UpdateInfo {
                available: true,
                version: Some(update.version.clone()),
                body: update.body.clone(),
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
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_data, 
            write_data, 
            get_data_path,
            check_for_updates,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
