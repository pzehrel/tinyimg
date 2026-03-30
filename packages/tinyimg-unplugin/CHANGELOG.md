# @pz4l/tinyimg-unplugin

## 0.4.0

### Minor Changes

- v0.3.1: CLI bug fixes and environment variable support

  - Fix `tinyimg key add` argument parsing error
  - Auto-fallback to free web interface when no API keys configured
  - Show relative paths in `list` command output
  - Add `--convertible` flag to filter convertible PNG files
  - Support 4 environment variable variants (TINYIMG_KEY, TINYIMG_KEYS, TINYPNG_KEY, TINYPNG_KEYS)
  - Add full test suite to pre-commit hook

### Patch Changes

- Updated dependencies
  - @pz4l/tinyimg-core@0.4.0

## 0.3.0

### Minor Changes

- v0.3.0 — Feature enhancements and quality assurance

  - CLI list command for previewing compressible images
  - PNG transparency detection for intelligent format conversion
  - Format conversion expansion (opaque PNG → JPG, WebP, AVIF support)
  - Infrastructure quality gates and safety mechanisms
  - Comprehensive test coverage

### Patch Changes

- Updated dependencies
  - @pz4l/tinyimg-core@0.3.0

## 0.1.0

### Patch Changes

- Fix test fixtures and package references

  - Add missing test fixture image symlinks for vite and webpack
  - Fix package name in test mock (@pz4l/tinyimg-core)

- Updated dependencies
  - @pz4l/tinyimg-core@0.1.0

## 0.1.0-beta.1

### Patch Changes

- 发布 0.1.1-beta.2 测试版本
- Fix Vite integration test fixture and test imports
- Updated dependencies
- Updated dependencies
  - @pz4l/tinyimg-core@0.1.0-beta.1

## 0.1.0-beta.0

### Minor Changes

- 992c1c6: Initial beta release

  - Core library with multi-key management and caching
  - CLI tool for batch image compression
  - unplugin for build-time optimization
  - Support for Vite, Webpack, and Rolldown

### Patch Changes

- Updated dependencies [992c1c6]
  - @pz4l/tinyimg-core@0.1.0-beta.0
