---
phase: 07-testing-and-documentation
plan: 09
subsystem: Testing
tags: [testing, bug-fix, race-condition, vitest]
dependency_graph:
  requires: []
  provides: [stable-hash-tests]
  affects: [test-reliability]
tech_stack:
  added: []
  patterns: [test-scoped-directories, try-finally-cleanup]
key_files:
  created: []
  modified:
    - path: packages/tinyimg-core/src/cache/hash.test.ts
      change: Replaced shared testDir with test-scoped directories
decisions: []
metrics:
  duration: 28s
  completed_date: 2026-03-25
  tasks_completed: 1
  files_modified: 1
  tests_added: 0
  tests_fixed: 5
---

# Phase 07 Plan 09: Fix hash.test.ts Race Condition Summary

Fixed race condition in hash.test.ts by eliminating shared state between parallel test executions, ensuring all 5 tests pass reliably without ENOENT errors.

## Problem Statement

The hash.test.ts file had a critical race condition caused by a shared `testDir` variable that was reused across all tests. When vitest ran tests in parallel (default behavior), tests would interfere with each other's directory operations, causing ENOENT errors during cleanup.

**Root Cause:**
```typescript
let testDir: string  // SHARED across all tests

beforeEach(async () => {
  testDir = join(tmpdir(), `tinyimg-test-${Date.now()}`)
  await mkdir(testDir, { recursive: true })
})

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true })
})
```

**Race Condition Scenario:**
1. Test A sets `testDir = "tinyimg-test-1000"`
2. Test B sets `testDir = "tinyimg-test-1001"` (overwrites the variable)
3. Test A's afterEach tries to delete "tinyimg-test-1001" (wrong directory)
4. Test B's afterEach tries to delete "tinyimg-test-1001" (already deleted)
5. Result: ENOENT errors and cleanup failures

## Solution Implemented

Eliminated shared state by:
1. Removing module-scoped `testDir` variable
2. Removing `beforeEach` and `afterEach` hooks
3. Creating test-scoped directories within each test
4. Using try/finally blocks to ensure cleanup

**New Pattern:**
```typescript
it('should return correct MD5 hash for given file content', async () => {
  const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
  await mkdir(testDir, { recursive: true })

  try {
    // Test code here
  }
  finally {
    await rm(testDir, { recursive: true, force: true })
  }
})
```

**Key Improvements:**
- Each test has complete isolation - no shared state
- Unique directory names using `Date.now() + Math.random()`
- Guaranteed cleanup via try/finally
- No race conditions in parallel execution

## Changes Made

### Modified Files

**packages/tinyimg-core/src/cache/hash.test.ts**
- Removed shared `testDir` variable declaration
- Removed `beforeEach` and `afterEach` hooks
- Added test-scoped directory creation in all 5 tests
- Wrapped all test logic in try/finally blocks for cleanup
- All tests now use unique directory names

## Test Results

**Before Fix:**
- Intermittent ENOENT errors during test cleanup
- Tests would fail when run in parallel
- Race conditions between test executions

**After Fix:**
```
Test Files  1 passed (1)
Tests       5 passed (5)
Duration    140ms
```

**Full Test Suite Verification:**
```
Test Files  26 passed | 1 skipped (27)
Tests       172 passed | 8 skipped (180)
Duration    10.33s
```

All 5 hash.test.ts tests now pass reliably with no ENOENT errors.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Why try/finally instead of afterEach?

The try/finally pattern ensures cleanup happens even if the test fails, while providing complete isolation. Each test manages its own directory lifecycle without relying on shared hooks that could cause race conditions.

### Why Date.now() + Math.random()?

Using both ensures uniqueness even when multiple tests start within the same millisecond (which can happen in parallel execution). The probability of collision is effectively zero.

### Performance Impact

Minimal - directory creation/cleanup overhead is negligible compared to test execution time. The improvement in test reliability far outweighs any minor performance cost.

## Success Criteria

- [x] hash.test.ts: 5/5 tests pass
- [x] No ENOENT errors in test output
- [x] Tests run successfully in parallel mode
- [x] No changes to hash.ts implementation (test-only fix)

## Next Steps

Plan 07-10 will continue with any remaining testing fixes or documentation tasks.
