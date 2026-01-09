//! CloudKit FFI bindings for iCloud sync
//!
//! This module provides Rust bindings to the Swift CloudKit bridge,
//! enabling iCloud synchronization of app data across devices.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;

/// Sync status enum matching the Swift side
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(i32)]
pub enum SyncStatus {
    Idle = 0,
    Syncing = 1,
    Synced = 2,
    Error = 3,
    Offline = 4,
}

impl From<i32> for SyncStatus {
    fn from(value: i32) -> Self {
        match value {
            0 => SyncStatus::Idle,
            1 => SyncStatus::Syncing,
            2 => SyncStatus::Synced,
            3 => SyncStatus::Error,
            4 => SyncStatus::Offline,
            _ => SyncStatus::Error,
        }
    }
}

impl std::fmt::Display for SyncStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncStatus::Idle => write!(f, "idle"),
            SyncStatus::Syncing => write!(f, "syncing"),
            SyncStatus::Synced => write!(f, "synced"),
            SyncStatus::Error => write!(f, "error"),
            SyncStatus::Offline => write!(f, "offline"),
        }
    }
}

// FFI declarations for the Swift CloudKit bridge
#[cfg(target_os = "macos")]
extern "C" {
    fn cloudkit_init() -> bool;
    fn cloudkit_check_account() -> bool;
    fn cloudkit_sync(
        local_data: *const c_char,
        local_last_modified: *const c_char,
        out_success: *mut bool,
        out_should_update_local: *mut bool,
        out_error: *mut *mut c_char,
        out_data: *mut *mut c_char,
        out_remote_last_modified: *mut *mut c_char,
    );
    fn cloudkit_push(
        data: *const c_char,
        last_modified: *const c_char,
        out_success: *mut bool,
        out_error: *mut *mut c_char,
    );
    fn cloudkit_pull(
        out_success: *mut bool,
        out_should_update_local: *mut bool,
        out_error: *mut *mut c_char,
        out_data: *mut *mut c_char,
        out_remote_last_modified: *mut *mut c_char,
    );
    fn cloudkit_get_status(
        out_status: *mut i32,
        out_error: *mut *mut c_char,
    );
    fn cloudkit_setup_subscriptions() -> bool;
    fn cloudkit_free_string(ptr: *mut c_char);
    fn cloudkit_delete_data() -> bool;
}

/// Helper to convert C string to Rust String and free it
#[cfg(target_os = "macos")]
unsafe fn c_string_to_rust(ptr: *mut c_char) -> Option<String> {
    if ptr.is_null() {
        None
    } else {
        let s = CStr::from_ptr(ptr).to_string_lossy().into_owned();
        cloudkit_free_string(ptr);
        Some(s)
    }
}

/// Rust-friendly sync result
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub success: bool,
    pub should_update_local: bool,
    pub error: Option<String>,
    pub data: Option<String>,
    pub remote_last_modified: Option<String>,
}

impl SyncResult {
    #[cfg(not(target_os = "macos"))]
    fn unavailable() -> Self {
        SyncResult {
            success: false,
            should_update_local: false,
            error: Some("CloudKit is only available on macOS".to_string()),
            data: None,
            remote_last_modified: None,
        }
    }
}

/// Rust-friendly sync status
#[derive(Debug, Clone)]
pub struct SyncStatusResult {
    pub status: SyncStatus,
    pub error: Option<String>,
}

/// CloudKit manager for Rust
pub struct CloudKit;

impl CloudKit {
    /// Initialize CloudKit - call on app startup
    #[cfg(target_os = "macos")]
    pub fn init() -> bool {
        unsafe { cloudkit_init() }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn init() -> bool {
        false
    }

    /// Check if iCloud account is available
    #[cfg(target_os = "macos")]
    pub fn check_account() -> bool {
        unsafe { cloudkit_check_account() }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn check_account() -> bool {
        false
    }

    /// Perform a full sync operation
    #[cfg(target_os = "macos")]
    pub fn sync(local_data: &str, local_last_modified: &str) -> SyncResult {
        let data_cstring = match CString::new(local_data) {
            Ok(s) => s,
            Err(_) => return SyncResult {
                success: false,
                should_update_local: false,
                error: Some("Invalid data string".to_string()),
                data: None,
                remote_last_modified: None,
            },
        };

        let modified_cstring = match CString::new(local_last_modified) {
            Ok(s) => s,
            Err(_) => return SyncResult {
                success: false,
                should_update_local: false,
                error: Some("Invalid timestamp string".to_string()),
                data: None,
                remote_last_modified: None,
            },
        };

        let mut success = false;
        let mut should_update_local = false;
        let mut error_ptr: *mut c_char = ptr::null_mut();
        let mut data_ptr: *mut c_char = ptr::null_mut();
        let mut remote_modified_ptr: *mut c_char = ptr::null_mut();

        unsafe {
            cloudkit_sync(
                data_cstring.as_ptr(),
                modified_cstring.as_ptr(),
                &mut success,
                &mut should_update_local,
                &mut error_ptr,
                &mut data_ptr,
                &mut remote_modified_ptr,
            );

            SyncResult {
                success,
                should_update_local,
                error: c_string_to_rust(error_ptr),
                data: c_string_to_rust(data_ptr),
                remote_last_modified: c_string_to_rust(remote_modified_ptr),
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn sync(_local_data: &str, _local_last_modified: &str) -> SyncResult {
        SyncResult::unavailable()
    }

    /// Push local data to CloudKit
    #[cfg(target_os = "macos")]
    pub fn push(data: &str, last_modified: &str) -> SyncResult {
        let data_cstring = match CString::new(data) {
            Ok(s) => s,
            Err(_) => return SyncResult {
                success: false,
                should_update_local: false,
                error: Some("Invalid data string".to_string()),
                data: None,
                remote_last_modified: None,
            },
        };

        let modified_cstring = match CString::new(last_modified) {
            Ok(s) => s,
            Err(_) => return SyncResult {
                success: false,
                should_update_local: false,
                error: Some("Invalid timestamp string".to_string()),
                data: None,
                remote_last_modified: None,
            },
        };

        let mut success = false;
        let mut error_ptr: *mut c_char = ptr::null_mut();

        unsafe {
            cloudkit_push(
                data_cstring.as_ptr(),
                modified_cstring.as_ptr(),
                &mut success,
                &mut error_ptr,
            );

            SyncResult {
                success,
                should_update_local: false,
                error: c_string_to_rust(error_ptr),
                data: None,
                remote_last_modified: None,
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn push(_data: &str, _last_modified: &str) -> SyncResult {
        SyncResult::unavailable()
    }

    /// Pull data from CloudKit
    #[cfg(target_os = "macos")]
    pub fn pull() -> SyncResult {
        let mut success = false;
        let mut should_update_local = false;
        let mut error_ptr: *mut c_char = ptr::null_mut();
        let mut data_ptr: *mut c_char = ptr::null_mut();
        let mut remote_modified_ptr: *mut c_char = ptr::null_mut();

        unsafe {
            cloudkit_pull(
                &mut success,
                &mut should_update_local,
                &mut error_ptr,
                &mut data_ptr,
                &mut remote_modified_ptr,
            );

            SyncResult {
                success,
                should_update_local,
                error: c_string_to_rust(error_ptr),
                data: c_string_to_rust(data_ptr),
                remote_last_modified: c_string_to_rust(remote_modified_ptr),
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn pull() -> SyncResult {
        SyncResult::unavailable()
    }

    /// Get current sync status
    #[cfg(target_os = "macos")]
    pub fn get_status() -> SyncStatusResult {
        let mut status: i32 = 0;
        let mut error_ptr: *mut c_char = ptr::null_mut();

        unsafe {
            cloudkit_get_status(&mut status, &mut error_ptr);

            SyncStatusResult {
                status: SyncStatus::from(status),
                error: c_string_to_rust(error_ptr),
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn get_status() -> SyncStatusResult {
        SyncStatusResult {
            status: SyncStatus::Offline,
            error: Some("CloudKit is only available on macOS".to_string()),
        }
    }

    /// Setup CloudKit subscriptions for push notifications
    #[cfg(target_os = "macos")]
    pub fn setup_subscriptions() -> bool {
        unsafe { cloudkit_setup_subscriptions() }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn setup_subscriptions() -> bool {
        false
    }

    /// Delete all app data from CloudKit
    #[cfg(target_os = "macos")]
    pub fn delete_data() -> bool {
        unsafe { cloudkit_delete_data() }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn delete_data() -> bool {
        false
    }
}

/// Serde-compatible sync result for Tauri commands
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncResultJson {
    pub success: bool,
    #[serde(rename = "shouldUpdateLocal")]
    pub should_update_local: bool,
    pub error: Option<String>,
    pub data: Option<String>,
    #[serde(rename = "remoteLastModified")]
    pub remote_last_modified: Option<String>,
}

impl From<SyncResult> for SyncResultJson {
    fn from(result: SyncResult) -> Self {
        SyncResultJson {
            success: result.success,
            should_update_local: result.should_update_local,
            error: result.error,
            data: result.data,
            remote_last_modified: result.remote_last_modified,
        }
    }
}

/// Serde-compatible sync status for Tauri commands
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncStatusJson {
    pub status: String,
    pub error: Option<String>,
}

impl From<SyncStatusResult> for SyncStatusJson {
    fn from(result: SyncStatusResult) -> Self {
        SyncStatusJson {
            status: result.status.to_string(),
            error: result.error,
        }
    }
}
