:
---
phase: 08-release-prep
plan: 03
subsystem: release-management
tags: [changesets, npm, beta-release, oidc, github-actions]
dependency_graph:
  requires: ["08-01", "08-02"]
  provides: ["08-04"]
  affects: ["packages/*/package.json", "CHANGELOG.md", ".changeset/"]
tech_stack:
  added: ["changesets pre mode", "npm OIDC trusted publishing"]
  patterns: ["prerelease versioning", "automated release workflow"]
key_files:
  created:
    - ".changeset/pre.json"
    - ".changeset/initial-beta-release.md"
    - "packages/tinyimg-core/CHANGELOG.md"
    - "packages/tinyimg-cli/CHANGELOG.md"
    - "packages/tinyimg-unplugin/CHANGELOG.md"
  modified:
    - "packages/tinyimg-core/package.json"
    - "packages/tinyimg-cli/package.json"
    - "packages/tinyimg-unplugin/package.json"
    - "pnpm-lock.yaml"
decisions:
  - "Use 0.1.0-beta.0 as first prerelease version (Changesets uses 0-indexing)"
  - "Configure OIDC trusted publishing instead of NPM_TOKEN secret"
  - "Trigger release workflow via git tags (v*)"
metrics:
  duration: "45m"
  completed_date: "2026-03-26"
  tasks_completed: 5
  tasks_total: 6
---

# Phase 08 Plan 03: Beta Release with Changesets - Summary

## Overview

Set up Changesets pre mode and attempted first beta release (v0.1.0-beta.0).

**One-liner**: Changesets pre mode configured with beta tag, versions bumped to 0.1.0-beta.0, release workflow triggered but blocked on npm OIDC configuration.

## Completed Tasks

### Task 2: Configure Changesets pre mode for beta releases

**Status**: COMPLETED

Entered Changesets pre mode with tag "beta":

```bash
pnpm changeset pre enter beta
```

Created `.changeset/pre.json`:
```json
{
  "mode": "pre",
  "tag": "beta",
  "initialVersions": {
    "@pz4l/tinyimg-cli": "0.0.0",
    "@pz4l/tinyimg-core": "0.0.0",
    "@pz4l/tinyimg-unplugin": "0.0.0"
  },
  "changesets": []
}
```

**Commit**: `992c1c6`

### Task 3: Create changeset for beta release

**Status**: COMPLETED

Created `.changeset/initial-beta-release.md`:

```yaml
---
"@pz4l/tinyimg-core": minor
"@pz4l/tinyimg-cli": minor
"@pz4l/tinyimg-unplugin": minor
---

Initial beta release

- Core library with multi-key management and caching
- CLI tool for batch image compression
- unplugin for build-time optimization
- Support for Vite, Webpack, and Rolldown
```

**Note**: Used `-f` flag to force add since `.changeset/.gitignore` ignores `*.md` files.

**Commit**: `992c1c6` (combined with Task 2)

### Task 4: Update versions with Changesets

**Status**: COMPLETED

Ran Changesets version command:

```bash
pnpm changeset version
```

Results:
- All packages updated from `0.0.0` to `0.1.0-beta.0`
- Generated individual CHANGELOG.md files for each package
- Updated `.changeset/pre.json` with changeset tracking

**Note**: Version is `0.1.0-beta.0` (not `0.1.0-beta.1`) because Changesets uses 0-indexing for prerelease versions.

**Commit**: `37ce661`

### Task 5: Commit version changes

**Status**: COMPLETED

Committed version updates:
- `packages/tinyimg-core/package.json` - version 0.1.0-beta.0
- `packages/tinyimg-cli/package.json` - version 0.1.0-beta.0
- `packages/tinyimg-unplugin/package.json` - version 0.1.0-beta.0
- `packages/tinyimg-core/CHANGELOG.md` - generated changelog
- `packages/tinyimg-cli/CHANGELOG.md` - generated changelog
- `packages/tinyimg-unplugin/CHANGELOG.md` - generated changelog

**Commit**: `37ce661`

### Task 6: Trigger release workflow

**Status**: AUTHENTICATION GATE

Created and pushed version tag:

```bash
git tag -a v0.1.0-beta.0 -m "Release v0.1.0-beta.0"
git push origin v0.1.0-beta.0
```

Release workflow triggered: https://github.com/pzehrel/tinyimg/actions/runs/23589254110

**Workflow Status**: FAILED - npm authentication error

## Authentication Gate: npm OIDC Configuration

### Issue

The release workflow failed with:

```
No NPM_TOKEN found, but OIDC is available - using npm trusted publishing
...
error an error occurred while publishing @pz4l/tinyimg-unplugin: ENEEDAUTH
This command requires you to be logged in to https://registry.npmjs.org
```

### Root Cause

While the GitHub Actions workflow is correctly configured with:
- `permissions: id-token: write` (OIDC token generation)
- `NPM_CONFIG_PROVENANCE: true` (provenance attestation)

The **npm registry side** of the OIDC trusted publishing has not been fully configured for the `@pz4l` scope packages.

### Required Action

Complete the npm Trusted Publishers configuration:

1. Visit https://www.npmjs.com/settings/pzehrel/packages
2. For each package (@pz4l/tinyimg-core, @pz4l/tinyimg-cli, @pz4l/tinyimg-unplugin):
   - Go to package Settings
   - Under "Publishing access", enable "Require two-factor authentication or automation tokens"
   - Under "Trusted Publishers", click "Add trusted publisher"
   - Select:
     - Publisher type: GitHub Actions
     - Repository: pzehrel/tinyimg
     - Workflow name: release.yml
3. Save the configuration

### Alternative (if OIDC not preferred)

Add `NPM_TOKEN` secret to GitHub repository:

1. Create npm automation token at https://www.npmjs.com/settings/tokens
2. Add to GitHub secrets at https://github.com/pzehrel/tinyimg/settings/secrets/actions
   - Name: `NPM_TOKEN`
   - Value: (npm automation token)

## Commits

| Hash | Message | Files |
|------|---------|-------|
| `992c1c6` | chore(08-03): enter changesets pre mode and add beta release changeset | `.changeset/pre.json`, `.changeset/initial-beta-release.md` |
| `37ce661` | chore(08-03): version packages to 0.1.0-beta.0 | `packages/*/package.json`, `packages/*/CHANGELOG.md`, `.changeset/pre.json` |
| `d6837da` | chore(08-03): update lockfile after version bump | `pnpm-lock.yaml` |

## Deviation from Plan

### Version Number

**Expected**: `0.1.0-beta.1`
**Actual**: `0.1.0-beta.0`

Changesets uses 0-indexing for prerelease versions. The first prerelease after a minor bump from 0.0.0 is `0.1.0-beta.0`, not `0.1.0-beta.1`. This is correct behavior.

### Task 1 Checkpoint

Task 1 was a `checkpoint:human-action` for npm credentials. Per the user's update, this was resolved via OIDC trusted publishing configuration. However, the npm registry-side configuration appears incomplete, causing the publish to fail.

## Next Steps

1. **Complete npm Trusted Publishers configuration** (required)
   - Add GitHub Actions as trusted publisher for all three packages
   - Or add NPM_TOKEN secret as fallback

2. **Retry release**
   - Delete and recreate tag: `git push --delete origin v0.1.0-beta.0 && git tag -d v0.1.0-beta.0 && git tag -a v0.1.0-beta.0 -m "Release v0.1.0-beta.0" && git push origin v0.1.0-beta.0`

3. **Verify npm publication**
   - Check packages appear at:
     - https://www.npmjs.com/package/@pz4l/tinyimg-core
     - https://www.npmjs.com/package/@pz4l/tinyimg-cli
     - https://www.npmjs.com/package/@pz4l/tinyimg-unplugin

## Self-Check

- [x] `.changeset/pre.json` exists with mode "pre" and tag "beta"
- [x] `.changeset/initial-beta-release.md` created
- [x] All package.json files updated to 0.1.0-beta.0
- [x] CHANGELOG.md files generated for all packages
- [x] Version tag v0.1.0-beta.0 created and pushed
- [x] Release workflow triggered
- [ ] Packages published to npm (BLOCKED: OIDC configuration incomplete)
