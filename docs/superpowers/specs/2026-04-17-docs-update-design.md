# Docs Update Design

## Scope

Update README.md, README.zh-CN.md, packages/cli/README.md, and plugin READMEs (vite/webpack/rsbuild).

## Changes

### 1. Remove Package Overview Table

The root READMEs currently list all packages including unpublished internal ones (`core`, `locale`). Replace the table with a short sentence and direct npm links for published packages only.

### 2. CLI Commands in Detail

Expand CLI section with:

- **Global options table**: `-o, --output`, `-s, --strategy`, `--noCache`, `-k, --key`, `-p, --parallel`
- **Default command** (`compress`): describe behavior, glob support, default strategy
- **`convert` subcommand**: description, `--noRename` flag, example
- **`keys` subcommand**: `add`, `del`, `list` (root `keys` lists all), examples
- **`list` / `ls` subcommand**: `--json`, `--convert` flags, example

### 3. CLI Environment Variables

Clarify the dual key sources:

- **Project-level keys**: CLI automatically reads `.env` and `.env.local` in the current directory. Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`, plus any prefix (e.g. `VITE_TINYIMG_KEY` — the suffix matcher `^(?:.*_)?(?:TINYIMG_KEY|TINYIMG_KEYS|TINYPNG_KEY|TINYPNG_KEYS)$` catches these).
- **User-level keys**: stored via `tinyimg keys add <key>` in `~/.tinyimg/keys.json`. Used as fallback when no project keys are available.
- No mention of `export USE_USER_TINYIMG_KEYS=true`.

### 4. Plugin Minimal Usage

Plugin quick-start examples should show zero-config usage first:

```ts
plugins: [tinyimg()]
```

Then optionally show a configured example.

### 5. Remove HTTP Status Codes

Remove references to 401/429 in strategy descriptions. Rephrase `API_FIRST` as "prefer API; fallback when key is invalid or rate-limited" without naming specific status codes.

### 6. Remove "Web Compressor" Terminology

Replace "web compressor" with neutral phrasing. The compressors are `ApiCompressor` and `WebCompressor` internally, but user-facing docs should describe them as "TinyPNG API" and "TinyPNG web endpoint" or simply describe behavior without naming them.

### 7. Plugin Environment Variables

Plugin docs should state:

- Plugins do not read `.env` files themselves; the build tool loads them.
- Recommend `.env.local` for local secrets.
- Show an example with a framework prefix: `VITE_TINYIMG_KEY=xxx`.
- Supported variable names: any ending with `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`.

## Files to Modify

- `README.md`
- `README.zh-CN.md`
- `packages/cli/README.md`
- `packages/vite/README.md`
- `packages/webpack/README.md`
- `packages/rsbuild/README.md`
