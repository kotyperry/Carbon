#!/bin/bash
# Build script for CarbonCloudKit Swift library

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Determine architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    TARGET="arm64-apple-macosx"
else
    TARGET="x86_64-apple-macosx"
fi

echo "Building CarbonCloudKit for $TARGET..."

# Build the Swift package in release mode
swift build -c release --arch $ARCH

# Find the built library
BUILD_DIR=".build/release"

if [ -f "$BUILD_DIR/libCarbonCloudKit.a" ]; then
    echo "Static library built successfully: $BUILD_DIR/libCarbonCloudKit.a"
    
    # Copy to a known location for Rust to link against
    mkdir -p ../lib
    cp "$BUILD_DIR/libCarbonCloudKit.a" ../lib/
    
    # Also copy the header
    cp Sources/CarbonCloudKit.h ../lib/
    
    echo "Library and header copied to ../lib/"
else
    echo "Error: Static library not found"
    exit 1
fi

echo "Build complete!"
