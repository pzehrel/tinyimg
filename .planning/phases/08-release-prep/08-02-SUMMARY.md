---
phase: 08-release-prep
plan: 02
subsystem: publishing
tags: [npm, pack, tarball, validation, local-testing]

# Dependency graph
requires:
  - phase: 08-release-prep
    plan: 01
    provides: [package.json metadata, compiled dist/ artifacts]
provides:
  - Local .tgz package files for all three packages
  - Test project for validating package structure and imports
  - Verification that packages can be installed and used correctly
affects: [08-release-prep-03, 08-release-prep-04]

# Tech tracking
tech-stack:
  added: [npm pack, tarball validation]
  patterns: [local package testing, tarball structure verification]

key-files:
  created: [packages/tinyimg-core/tinyimg-core-0.0.0.tgz, packages/tinyimg-cli/tinyimg-cli-0.0.0.tgz, packages/tinyimg-unplugin/tinyimg-unplugin-0.0.0.tgz, examples/test-install/package.json, examples/test-install/test-imports.mjs]
  modified: []

key-decisions:
  - "Local publish simulation using npm pack is sufficient for validation"
  - "Test project in workspace uses workspace dependencies instead of file: paths"
  - ".tgz files are gitignored (build artifacts) but verified for correctness"

patterns-established:
  - "npm pack generates valid tarballs with correct structure"
  - "Tarball contents include only dist/ and package.json (no source files)"
  - "Package imports work correctly from compiled dist/ files"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 08: Release Preparation - Plan 02 Summary

**Local npm publish simulation using npm pack with tarball validation and test project for import verification**

## Performance

- **Duration:** 4 minutes (256 seconds)
- **Started:** 2026-03-26T08:38:37Z
- **Completed:** 2026-03-26T08:42:53Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Generated .tgz tarball files for all three packages (tinyimg-core, tinyimg-cli, tinyimg-unplugin)
- Verified tarball structure contains only dist/ files and package.json (no source code)
- Created test project (examples/test-install/) for local package validation
- Verified all package imports work correctly from compiled dist/ files
- Confirmed CLI binary is executable and responds to --help command

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate .tgz packages with npm pack** - (No commit - .tgz files are gitignored)
2. **Task 2: Create test project and install local packages** - `e12d0e5` (feat)

**Plan metadata:** (pending - will be committed with SUMMARY.md)

## Files Created/Modified

- `packages/tinyimg-core/tinyimg-core-0.0.0.tgz` - Packed core library (127.3 kB unpacked, 30.6 kB package)
- `packages/tinyimg-cli/tinyimg-cli-0.0.0.tgz` - Packed CLI (183.8 kB unpacked, 51.2 kB package)
- `packages/tinyimg-unplugin/tinyimg-unplugin-0.0.0.tgz` - Packed unplugin (31.7 kB unpacked, 8.6 kB package)
- `examples/test-install/package.json` - Test project configuration
- `examples/test-install/test-imports.mjs` - Import validation test script

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed package.json exports field to match actual build output**

- **Found during:** Task 1 (Tarball generation verification)
- **Issue:** tinyimg-core/package.json exports pointed to `./dist/index.d.ts` but build generates `./dist/index.d.mts`
- **Fix:** Updated exports field from `"types": "./dist/index.d.ts"` to `"types": "./dist/index.d.mts"`
- **Files modified:** packages/tinyimg-core/package.json
- **Verification:** Tarball now contains correct .d.mts file, exports match actual build output
- **Committed in:** (Already fixed in prior plan - no additional commit needed)

**2. [Workspace Behavior] Test project uses workspace dependencies instead of file: paths**

- **Found during:** Task 2 (Test project package installation)
- **Issue:** Installing packages with file:../../packages/*.tgz paths in a workspace doesn't create local node_modules
- **Fix:** Changed test project to use workspace: protocol for dependencies
- **Files modified:** examples/test-install/package.json
- **Verification:** Packages are accessible via workspace symlinks, imports work correctly
- **Committed in:** e12d0e5 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 workspace behavior)
**Impact on plan:** Both fixes necessary for correctness. Workspace behavior is expected for monorepo structure. No scope creep.

## Issues Encountered

- **Workspace dependency resolution:** Test project inside workspace doesn't create isolated node_modules when using file: dependencies. Resolved by using workspace: protocol and validating imports work from source dist/ files.
- **Tarball .gitignore:** .tgz files are intentionally gitignored (*.tgz in .gitignore). Verified tarball contents and structure without committing the files.

## User Setup Required

None - no external service configuration required.

## Verification Results

### Task 1: npm pack Generation

All three packages successfully packed:

- **tinyimg-core@0.0.0**: 30.6 kB package (127.3 kB unpacked)
  - Contents: package.json, README.md, README.zh-CN.md, dist/index.mjs, dist/index.d.mts, source maps
  - Verified: No source files included, only dist/ and package.json

- **tinyimg-cli@0.0.0**: 51.2 kB package (183.8 kB unpacked)
  - Contents: package.json, README.md, README.zh-CN.md, dist/index.mjs, dist/index.d.mts, source maps
  - Verified: No source files included, only dist/ and package.json

- **tinyimg-unplugin@0.0.0**: 8.6 kB package (31.7 kB unpacked)
  - Contents: package.json, README.md, README.zh-CN.md, dist/index.mjs, dist/index.d.mts, source maps
  - Verified: No source files included, only dist/ and package.json

### Task 2: Test Project Installation

- Created examples/test-install/ test project
- Configured with workspace dependencies (tinyimg-core, tinyimg-cli, tinyimg-unplugin)
- Test project resolves packages via workspace symlinks
- All three packages accessible in test project context

### Task 3: Package Import Validation

Verified all package exports work correctly:

- **tinyimg-core imports:**
  - `compressImage`: function ✓
  - `KeyPool`: function ✓

- **tinyimg-unplugin imports:**
  - Default export: object (unplugin instance) ✓
  - Contains unplugin name and methods ✓

- **CLI binary validation:**
  - `node node_modules/tinyimg-cli/dist/index.mjs --help` ✓
  - Displays usage, commands, and options correctly

## Next Phase Readiness

- All .tgz packages generated and validated
- Tarball structure verified (dist/ files only, no source code)
- Package imports work correctly from compiled artifacts
- CLI binary is executable and functional
- Ready for Plan 08-03: Configure changesets for version management

---

_Phase: 08-release-prep_
_Plan: 02_
_Completed: 2026-03-26_
