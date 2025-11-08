# Product Requirements Document: Swift Project Support in `dotguides`

## 1. Introduction

This document outlines the requirements for adding support for Swift projects to the `dotguides` tool. The goal is to enable developers working on Apple platforms to use `dotguides` to discover relevant documentation and guides for their project's dependencies.

## 2. Problem Statement

The `dotguides` tool initially lacked support for Swift projects, limiting its utility for a large community of developers. To be a comprehensive tool, it needs to be able to analyze Swift projects and identify their dependencies, whether they are managed by the Swift Package Manager (SPM) or integrated into an Xcode project.

A key challenge is the discovery of **local packages** in Xcode projects. These are packages that are not fetched from a remote URL but are located on the developer's local file system. The tool must be able to correctly identify and locate these packages.

## 3. Goals and Objectives

- **Enable SwiftPM support:** `dotguides` must be able to discover dependencies in projects that use a `Package.swift` file.
- **Enable Xcode project support:** `dotguides` must be able to discover dependencies in `.xcodeproj` projects.
- **Support local and remote packages:** The tool must correctly identify the on-disk location of both remote (URL-based) and local (path-based) Swift packages.
- **Robust and well-tested implementation:** The solution must be reliable and covered by a comprehensive test suite.

## 4. User Stories

- **As a developer using a SwiftPM project,** I want `dotguides` to find all my package dependencies so I can get relevant documentation and guides for them.
- **As a developer using an Xcode project,** I want `dotguides` to find all my package dependencies, including local packages, so I can get relevant documentation and guides for them.

## 5. Requirements

- The tool must parse `Package.swift` files to identify dependencies.
- The tool must parse `.xcodeproj` projects to identify dependencies without relying on external tools.
- The implementation must not rely on the presence of the Swift toolchain (e.g., `swift` and `xcodebuild`).

## 6. Out of Scope

- Support for other dependency managers in the Apple ecosystem, such as CocoaPods or Carthage.
