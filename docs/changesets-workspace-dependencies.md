# Changesets Workspace Dependency Resolution

This document explains how Changesets handles workspace dependencies in the TinyImg monorepo.

## Configuration

The `.changeset/config.json` file uses the following key settings:

```json
{
  "fixed": [
    ["@pz4l/tinyimg-core", "@pz4l/tinyimg-cli", "@pz4l/tinyimg-unplugin"]
  ],
  "updateInternalDependencies": "patch"
}
```

## How It Works

### 1. Fixed Versioning

The `fixed` array ensures all three packages always version together. When any package gets a changeset, all three packages bump version (major, minor, or patch).

### 2. Workspace Protocol Resolution

During development, package.json files use the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@pz4l/tinyimg-core": "workspace:*"
  }
}
```

When you run `pnpm changeset version`, Changesets automatically replaces `workspace:*` with the actual version number:

```json
{
  "dependencies": {
    "@pz4l/tinyimg-core": "0.1.0-beta.2"
  }
}
```

### 3. Publishing

After running `pnpm changeset version` and committing the changes, the published package on npm will show actual version numbers, not `workspace:*`.

## Verification

To verify workspace dependencies are resolved correctly:

```bash
# 1. Create a changeset
pnpm changeset

# 2. Apply version bumps
pnpm changeset version

# 3. Check that workspace:* is replaced
cat packages/tinyimg-cli/package.json | jq '.dependencies["@pz4l/tinyimg-core"]'
# Should output: "0.1.0" (not "workspace:*")

# 4. Commit the changes
git add .
git commit -m "chore: version packages"
```

## Defense in Depth

The `.npmrc` files (root and packages/) provide additional protection:

```ini
workspace-dependency-behavior=strict
```

This ensures `pnpm publish` will fail if any `workspace:*` protocol remains unresolved, preventing broken packages from being published.

## Current Behavior

As of 2026-03-28, the published packages correctly resolve workspace dependencies:

- `@pz4l/tinyimg-cli@0.1.0-beta.1` depends on `@pz4l/tinyimg-core@0.1.0-beta.1`
- `@pz4l/tinyimg-unplugin@0.1.0-beta.1` depends on `@pz4l/tinyimg-core@0.1.0-beta.1`

This confirms the Changesets workflow is working correctly.
