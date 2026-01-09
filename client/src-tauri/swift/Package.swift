// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "CarbonCloudKit",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "CarbonCloudKit",
            type: .static,
            targets: ["CarbonCloudKit"]
        ),
    ],
    targets: [
        .target(
            name: "CarbonCloudKit",
            dependencies: [],
            path: "Sources"
        ),
    ]
)
