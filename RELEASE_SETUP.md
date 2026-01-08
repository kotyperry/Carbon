# Release Setup Guide

This guide explains how to set up automatic releases for the Carbon app.

## Prerequisites

1. **Apple Developer Account** - Required for code signing and notarization on macOS
2. **GitHub Repository** - With admin access to configure secrets

## GitHub Secrets Configuration

Navigate to your repository's **Settings > Secrets and variables > Actions** and add the following secrets:

### Apple Code Signing Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate | Export from Keychain Access (see below) |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 certificate | Set when exporting the certificate |
| `APPLE_SIGNING_IDENTITY` | Certificate name | e.g., `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Your Apple ID email | Your Apple Developer account email |
| `APPLE_PASSWORD` | App-specific password | Generate at appleid.apple.com |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID | Found in Apple Developer portal |

### Tauri Update Signing Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key for update signatures | Generate with Tauri CLI (see below) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key | Set when generating the key |

## Step-by-Step Setup

### 1. Export Apple Certificate

1. Open **Keychain Access** on your Mac
2. Find your "Developer ID Application" certificate
3. Right-click and select **Export**
4. Save as `.p12` format with a strong password
5. Convert to base64:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```
6. Paste the result as `APPLE_CERTIFICATE` secret

### 2. Create App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in and go to **Security > App-Specific Passwords**
3. Generate a new password for "GitHub Actions"
4. Save as `APPLE_PASSWORD` secret

### 3. Generate Tauri Signing Keys

Run the following command to generate a key pair:

```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/carbon.key
```

This will output:
- A private key (save the entire output as `TAURI_SIGNING_PRIVATE_KEY`)
- A public key (add this to `tauri.conf.json` under `plugins.updater.pubkey`)

**Important:** After generating the key, update `client/src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/YOUR_USERNAME/canban/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### 4. Update Repository URL

Update the `endpoints` URL in `client/src-tauri/tauri.conf.json` to match your GitHub repository:

```json
"endpoints": [
  "https://github.com/YOUR_USERNAME/canban/releases/latest/download/latest.json"
]
```

### 5. Version Management

Before pushing to master, update the version in both files:

- `client/src-tauri/tauri.conf.json` - `version` field
- `client/src-tauri/Cargo.toml` - `version` field

The workflow will create a release with the version from `tauri.conf.json`.

## How It Works

1. **Push to master** - Triggers the GitHub Actions workflow
2. **Create Release** - A draft release is created with the current version
3. **Build macOS** - The app is built, signed, and notarized
4. **Upload Artifacts** - The `.dmg`, `.app.tar.gz`, and `latest.json` are uploaded
5. **Publish Release** - The release is published (no longer draft)

## Update Flow

When users run the app:

1. On startup, the app checks `latest.json` from GitHub Releases
2. If a newer version exists, a notification appears
3. User clicks "Update & Restart"
4. The update is downloaded, verified, and installed
5. The app restarts with the new version

## Troubleshooting

### Build Fails with Signing Error

- Verify `APPLE_SIGNING_IDENTITY` matches your certificate exactly
- Ensure the certificate is valid and not expired
- Check that `APPLE_CERTIFICATE` is properly base64 encoded

### Notarization Fails

- Verify `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` are correct
- Ensure the app-specific password is valid
- Check Apple's notarization service status

### Updates Not Detected

- Verify the `pubkey` in `tauri.conf.json` matches the generated public key
- Check that the `endpoints` URL is correct
- Ensure the release is published (not draft)

## Local Testing

To test the build locally without signing:

```bash
cd client
npm run tauri:build
```

To test with signing (requires certificates):

```bash
cd client
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)" npm run tauri:build
```
