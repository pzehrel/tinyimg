---
phase: 06-unplugin-plugin
plan: 01
title: "Test Infrastructure Setup"
oneLiner: "Test stub infrastructure for unplugin development with fixtures and integration test scaffolding"
duration: "3m 20s"
completedDate: 2026-03-25
tags: ['test-infrastructure', 'tdd', 'fixtures', 'wave-0']
subsystem: "unplugin"
requirements: []
dependencyGraph:
  requires:
    - phase: "04-fallback-and-concurrency"
      plan: "00"
      reason: "Test fixture patterns (PNG/JPG buffer generation)"
    - phase: "02-api-key"
      plan: "04"
      reason: "KeyPool API integration patterns"
  provides:
    - "Test stub infrastructure for unplugin modules (index, filter, options, logger)"
    - "Fixture images for testing file detection and compression workflow"
    - "Vite fixture project for integration testing"
  affects:
    - phase: "06-unplugin-plugin"
      plans: ["02", "03", "04"]
      reason: "TDD foundation for implementation plans"
techStack:
  added:
    - "Test fixture generation script (TypeScript)"
  patterns:
    - "Wave 0 test infrastructure (test stubs with skip markers)"
    - "Minimal valid image buffers for testing (PNG/JPG)"
    - "Vite fixture project for integration testing"
keyFiles:
  created:
    - "packages/tinyimg-unplugin/src/index.test.ts"
    - "packages/tinyimg-unplugin/src/filter.test.ts"
    - "packages/tinyimg-unplugin/src/options.test.ts"
    - "packages/tinyimg-unplugin/src/logger.test.ts"
    - "packages/tinyimg-unplugin/test/fixtures/generate-fixtures.ts"
    - "packages/tinyimg-unplugin/test/fixtures/images/sample.png"
    - "packages/tinyimg-unplugin/test/fixtures/images/sample.jpg"
    - "packages/tinyimg-unplugin/test/fixtures/vite/package.json"
    - "packages/tinyimg-unplugin/test/fixtures/vite/vite.config.ts"
    - "packages/tinyimg-unplugin/test/fixtures/vite/src/main.ts"
    - "packages/tinyimg-unplugin/test/fixtures/vite/index.html"
  modified:
    - "packages/tinyimg-unplugin/src/index.ts (no changes, empty export)"
decisions:
  - "Use Phase 04 Wave 0 pattern: test stubs first, implementation in later plans"
  - "Minimal valid image buffers (1KB PNG/JPG) for testing file detection"
  - "Vite fixture project configured with all plugin options for integration testing"
metrics:
  duration: "3m 20s"
  tasks: 3
  files: 11
  testStubs: 25
  fixtures: 2 images, 1 Vite project
---

# Phase 06 Plan 01: Test Infrastructure Setup Summary

## Objective

Set up test infrastructure for unplugin development with test stubs, fixtures, and integration test scaffolding. This is Wave 0 of Phase 06, following the TDD pattern established in Phase 04.

## What Was Done

### Task 1: Create Module Test Stubs

Created 4 test stub files with 25 total tests, all marked as `.skip`:

**index.test.ts** (6 tests):
- Unplugin factory creation
- Transform hook presence
- Non-image file filtering
- Production build compression
- Development mode skip
- Project-only cache usage

**filter.test.ts** (7 tests):
- Extension validation (.png, .jpg, .jpeg)
- Format rejection (.svg, .webp, .avif)
- Include glob pattern support
- Exclude glob pattern support
- Array pattern handling
- Fast path extension check

**options.test.ts** (5 tests):
- Default values application
- Mode enum validation
- String to array conversion (include/exclude)
- Parallel number validation

**logger.test.ts** (7 tests):
- Verbose mode initialization
- Summary mode initialization
- Compression statistics tracking
- Individual file logging (verbose)
- Summary logging
- Warning logging (non-strict mode)
- Error logging (strict mode)

### Task 2: Create Test Fixtures Directory and Sample Images

Created fixture directory structure:
```
packages/tinyimg-unplugin/test/fixtures/
├── images/
│   ├── .gitkeep
│   ├── sample.png (1KB, valid PNG format)
│   └── sample.jpg (1KB, valid JPG format)
└── vite/ (Task 3)
```

**Fixture generation script** (`generate-fixtures.ts`):
- Creates minimal valid PNG buffer (8-byte signature + IHDR + IEND chunks)
- Creates minimal valid JPG buffer (SOI + APP0 + SOF0 + SOS + EOI markers)
- Uses ES module pattern with `fileURLToPath` for `__dirname`
- Files verified with `file` command: "PNG image data, 1 x 1" and "JPEG image data, JFIF standard 1.01"

### Task 3: Create Vite Fixture Project for Integration Tests

Created minimal Vite project structure:
```json
{
  "name": "vite-fixture",
  "type": "module",
  "scripts": { "build": "vite build" },
  "dependencies": {
    "tinyimg-unplugin": "workspace:*",
    "vite": "^5.0.0"
  }
}
```

**vite.config.ts** - Configures unplugin with all options:
- mode: 'random'
- cache: true
- parallel: 8
- strict: false
- verbose: true

**src/main.ts** - Imports sample images to test transform hook

**index.html** - HTML entry point for Vite build

## Technical Decisions

### Test Infrastructure Pattern

Following Phase 04 Wave 0 pattern (04-00-PLAN.md):
- **Test stubs first**: All tests marked with `.skip` to establish what needs to be tested
- **Implementation later**: Tests will be implemented in Plans 02-04 using TDD (RED → GREEN → REFACTOR)
- **Fixture generation**: Minimal valid buffers for testing file detection, not actual compression

### Image Fixture Design

**Minimal valid formats** (not full images, just enough to test file detection):
- PNG: 1KB with 1x1 pixel, valid magic bytes (89 50 4E 47), IHDR and IEND chunks
- JPG: 1KB with 1x1 pixel, valid magic bytes (FF D8 FF), JFIF identifier, SOF0 and SOS markers

This approach:
- Avoids committing binary assets that bloat repository
- Tests file detection without actual TinyPNG API calls
- Matches Phase 04 fixture pattern

### Vite Fixture Configuration

**All plugin options exposed** for comprehensive integration testing:
- Tests transform hook execution during build
- Tests production vs development mode detection
- Tests file filtering (include/exclude patterns)
- Tests cache integration (project-only)
- Tests error handling (strict vs non-strict mode)

## Deviations from Plan

**None** - Plan executed exactly as written.

## Known Stubs

No implementation stubs exist. This is Wave 0 - only test stubs were created. Implementation will occur in Plans 02-04 following TDD workflow.

## Test Coverage

**25 test stubs** across 4 modules:
- 6 tests for unplugin factory (index.test.ts)
- 7 tests for file filtering (filter.test.ts)
- 5 tests for options validation (options.test.ts)
- 7 tests for logging functionality (logger.test.ts)

**Verification**: `pnpm test --run packages/tinyimg-unplugin` shows all 25 tests skipped, ready for TDD implementation.

## Integration Points

**Test → Source Links** (established in test structure):
- index.test.ts → index.ts (unplugin factory)
- filter.test.ts → filter.ts (file filtering logic)
- options.test.ts → options.ts (options normalization)
- logger.test.ts → logger.ts (logging and statistics)

**Vite Fixture → Unplugin**:
- vite.config.ts imports tinyimg-unplugin plugin
- main.ts imports sample images to trigger transform hook
- Tests plugin registration and build integration

## Next Steps

**Plan 06-02**: Implement filter module (file extension validation, include/exclude patterns)
**Plan 06-03**: Implement logger and options modules (statistics tracking, configuration normalization)
**Plan 06-04**: Implement unplugin factory (transform hook, build tool integration)
**Plan 06-05**: Integration tests and end-to-end verification

All plans will use TDD workflow:
1. Remove `.skip` from test (RED)
2. Implement module to pass test (GREEN)
3. Refactor if needed (REFACTOR)

## Performance

**Duration**: 3 minutes 20 seconds
**Tasks**: 3
**Files Created**: 11
**Test Stubs**: 25
**Fixtures**: 2 images + 1 Vite project

## Verification

- [x] All test stub files created with skip markers
- [x] Test fixtures directory structure exists
- [x] Sample image files created (PNG and JPG)
- [x] Vite fixture project configured with plugin reference
- [x] Running `pnpm test --run packages/tinyimg-unplugin` shows 25 skip tests
- [x] No compilation errors in test files
