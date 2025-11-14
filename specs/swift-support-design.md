# Design Document: Swift Project Support in `dotguides`

## 1. Overview

This document describes the technical design and implementation of the Swift language support in `dotguides`. It covers the architecture, implementation details, and testing strategy for the feature.

## 2. Architecture

A new `SwiftLanguageAdapter` class was created, implementing the `LanguageAdapter` interface. This adapter encapsulates all the logic for detecting and analyzing Swift projects.

## 3. Implementation Details

### 3.1. Project Detection

The `SwiftLanguageAdapter` detects a Swift project by checking for the presence of either a `Package.swift` file or a `.xcodeproj` directory.

### 3.2. SwiftPM Project Discovery

For projects with a `Package.swift` file, the adapter will use a regular expression to parse the file's contents and extract the declared dependencies. This "good enough" approach avoids the need to invoke the `swift` command-line tool.

### 3.3. Xcode Project Discovery

For Xcode projects, the adapter will use the `@bacons/xcode` npm package to parse the `project.pbxproj` file. This provides a JSON representation of the project, which can be traversed to identify package dependencies without shelling out to `xcodebuild`.

- **Local vs. Remote Packages:** The parsing logic distinguishes between local and remote packages. For local packages, the adapter resolves their on-disk location using the relative path specified in the project file. For remote packages, the adapter searches for the checked-out source code in the `DerivedData` directory.

- **`DerivedData` Search:** To improve performance, the adapter performs a targeted search within the `DerivedData` directory. It first looks for a subdirectory named after the Xcode project, and then searches for the package within that subdirectory's `SourcePackages/checkouts` folder. This is significantly faster than searching the entire `DerivedData` directory. The `DerivedData` path is also configurable to support testing and non-standard setups.

- **Evolution of the Implementation:** The initial implementation for Xcode projects was not robust and failed to correctly parse the `xcodebuild` output. Debugging involved adding logging to inspect the command's output, which revealed that the initial regular expression was too simplistic. The final implementation uses a more specific regular expression that targets the "Resolved source packages" section of the output, making the parsing more reliable.

## 4. Testing

Unit tests have been added in `src/lib/languages/swift.test.ts`. The tests cover:

- Detection of SwiftPM packages.
- Detection of Xcode projects.
- Correct identification of the number of dependencies.
- Correct identification of local packages and their paths.

## 5. Dependencies

The implementation will not require the user to have the Swift toolchain installed. Nice!
