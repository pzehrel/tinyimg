# Changelog

## 0.0.1-beta.1

### Patch Changes

- Updated dependencies
  - @pz4l/tinyimg-core@0.1.1-beta.2
  - @pz4l/tinyimg-cli@0.1.1-beta.2
  - @pz4l/tinyimg-unplugin@0.1.1-beta.2

## 0.0.1-beta.0

### Patch Changes

- Updated dependencies
  - @pz4l/tinyimg-core@0.1.0-beta.2
  - @pz4l/tinyimg-cli@0.1.0-beta.2
  - @pz4l/tinyimg-unplugin@0.1.0-beta.2

All notable changes to this project will be documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for version management. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project structure with pnpm workspace monorepo setup
- **@pz4l/tinyimg-core**: Core library for TinyPNG image compression
  - Multi-API key management with intelligent rotation
  - MD5-based caching system with project and global levels
  - Fallback compression via tinypng.com web interface
  - Configurable concurrency control (default: 8)
  - Automatic key exhaustion handling with fallback strategy
- **@pz4l/tinyimg-cli**: Command-line tool for batch image compression
  - Multi-file/directory input with glob pattern support
  - Global key management commands (`key add`, `key remove`, `key list`)
  - Real-time API key usage display with masked output
  - Configurable output directory, key selection, mode, and parallel processing
  - Interactive prompts using @posva/prompts
- **@pz4l/tinyimg-unplugin**: Universal plugin for Vite, Webpack, and Rolldown
  - Transform hook for automatic image compression during build
  - File filtering with configurable include/exclude patterns
  - Project-level caching integration
  - Build statistics logging

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

## [0.0.0] - 2026-03-25

Initial MVP release with core functionality for TinyPNG image compression across CLI and build tools.

---

## Using Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

### Adding a Changeset

When making changes that affect the public API or fix bugs:

1. Run the changeset command:

   ```bash
   pnpm changeset
   ```

2. Follow the interactive prompts to:

   - Select the packages affected by your changes
   - Choose the semver bump type (major, minor, patch)
   - Write a summary of the changes

3. Commit the generated changeset file (located in `.changeset/`):
   ```bash
   git add .changeset/
   git commit -m "chore: add changeset for [description]"
   ```

### Versioning and Releases

All three packages (`@pz4l/tinyimg-core`, `@pz4l/tinyimg-cli`, `@pz4l/tinyimg-unplugin`) are versioned together using the `fixed` configuration in `.changeset/config.json`.

To release a new version:

1. Run the version command to update package versions and changelog:

   ```bash
   pnpm version
   ```

2. Review the changes, then publish:
   ```bash
   pnpm release
   ```

### Changeset Categories

Changesets should use one of these categories:

- **major**: Breaking changes to the public API
- **minor**: New features that are backward compatible
- **patch**: Bug fixes and minor improvements

### Changelog Categories

Entries are organized under these sections:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security-related changes
