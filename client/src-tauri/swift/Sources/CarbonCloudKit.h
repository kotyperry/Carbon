// CarbonCloudKit C Header for Rust FFI
// This header defines the C interface for the Swift CloudKit bridge

#ifndef CARBON_CLOUDKIT_H
#define CARBON_CLOUDKIT_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// Initialize CloudKit - call on app startup
bool cloudkit_init(void);

// Check if iCloud account is available
bool cloudkit_check_account(void);

// Perform a full sync operation
// All out_ parameters are output parameters that will be filled by the function
// String outputs (out_error, out_data, out_remote_last_modified) must be freed with cloudkit_free_string
void cloudkit_sync(
    const char* local_data,
    const char* local_last_modified,
    bool* out_success,
    bool* out_should_update_local,
    char** out_error,
    char** out_data,
    char** out_remote_last_modified
);

// Push local data to CloudKit
void cloudkit_push(
    const char* data,
    const char* last_modified,
    bool* out_success,
    char** out_error
);

// Pull data from CloudKit
void cloudkit_pull(
    bool* out_success,
    bool* out_should_update_local,
    char** out_error,
    char** out_data,
    char** out_remote_last_modified
);

// Get current sync status
// status: 0=idle, 1=syncing, 2=synced, 3=error, 4=offline
void cloudkit_get_status(
    int32_t* out_status,
    char** out_error
);

// Setup CloudKit subscriptions for push notifications
bool cloudkit_setup_subscriptions(void);

// Free a string allocated by the Swift side
void cloudkit_free_string(char* ptr);

// Delete all app data from CloudKit
bool cloudkit_delete_data(void);

#ifdef __cplusplus
}
#endif

#endif // CARBON_CLOUDKIT_H
