use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    // Standard Tauri build
    tauri_build::build();

    // Only build Swift library on macOS
    #[cfg(target_os = "macos")]
    {
        build_swift_library();
    }
}

#[cfg(target_os = "macos")]
fn build_swift_library() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let swift_dir = PathBuf::from(&manifest_dir).join("swift");
    let lib_dir = PathBuf::from(&manifest_dir).join("lib");

    // Create lib directory if it doesn't exist
    std::fs::create_dir_all(&lib_dir).ok();

    // Determine architecture
    let arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| "aarch64".to_string());
    let swift_arch = if arch == "aarch64" { "arm64" } else { "x86_64" };

    println!("cargo:rerun-if-changed=swift/Sources/");
    println!("cargo:rerun-if-changed=swift/Package.swift");

    // Check if Swift package exists
    if !swift_dir.join("Package.swift").exists() {
        println!("cargo:warning=Swift package not found, skipping CloudKit build");
        return;
    }

    // Build Swift package
    println!("cargo:warning=Building Swift CloudKit library...");
    
    let build_status = Command::new("swift")
        .args(["build", "-c", "release", "--arch", swift_arch])
        .current_dir(&swift_dir)
        .status();

    match build_status {
        Ok(status) if status.success() => {
            println!("cargo:warning=Swift library built successfully");
        }
        Ok(status) => {
            println!("cargo:warning=Swift build failed with status: {}", status);
            return;
        }
        Err(e) => {
            println!("cargo:warning=Failed to run swift build: {}", e);
            return;
        }
    }

    // Find and copy the built library
    let build_dir = swift_dir.join(".build").join("release");
    let lib_name = "libCarbonCloudKit.a";
    let src_lib = build_dir.join(lib_name);
    let dst_lib = lib_dir.join(lib_name);

    if src_lib.exists() {
        if let Err(e) = std::fs::copy(&src_lib, &dst_lib) {
            println!("cargo:warning=Failed to copy library: {}", e);
            return;
        }
        println!("cargo:warning=Library copied to {:?}", dst_lib);
    } else {
        println!("cargo:warning=Built library not found at {:?}", src_lib);
        return;
    }

    // Copy header file
    let header_src = swift_dir.join("Sources").join("CarbonCloudKit.h");
    let header_dst = lib_dir.join("CarbonCloudKit.h");
    if header_src.exists() {
        std::fs::copy(&header_src, &header_dst).ok();
    }

    // Link against the Swift library and required frameworks
    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    println!("cargo:rustc-link-lib=static=CarbonCloudKit");
    
    // Link required macOS frameworks
    println!("cargo:rustc-link-lib=framework=CloudKit");
    println!("cargo:rustc-link-lib=framework=Foundation");
    println!("cargo:rustc-link-lib=framework=CoreFoundation");
    
    // Link Swift runtime libraries
    // Find Swift library path
    let swift_lib_output = Command::new("xcrun")
        .args(["--show-sdk-path"])
        .output();
    
    if let Ok(output) = swift_lib_output {
        let sdk_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let swift_lib_path = format!("{}/usr/lib/swift", sdk_path);
        println!("cargo:rustc-link-search=native={}", swift_lib_path);
    }

    // Link Swift standard library
    let toolchain_output = Command::new("xcrun")
        .args(["--toolchain", "default", "--find", "swift"])
        .output();
    
    if let Ok(output) = toolchain_output {
        let swift_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if let Some(toolchain_dir) = PathBuf::from(&swift_path).parent().and_then(|p| p.parent()) {
            let swift_lib = toolchain_dir.join("lib").join("swift").join("macosx");
            if swift_lib.exists() {
                println!("cargo:rustc-link-search=native={}", swift_lib.display());
            }
        }
    }
}
