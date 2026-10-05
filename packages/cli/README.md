# @pz4l/tinyimg-cli

[![npm](https://img.shields.io/npm/v/@pz4l/tinyimg-cli)](https://www.npmjs.com/package/@pz4l/tinyimg-cli)

TinyPNG image compression CLI.

## Installation

```bash
npm i -g @pz4l/tinyimg-cli
```

Or use via `npx` without installing:

```bash
npx @pz4l/tinyimg-cli src/assets/**
```

## Usage

### Global Options

| Option                      | Alias | Description                         | Default |
| --------------------------- | ----- | ----------------------------------- | ------- |
| `-o, --output <dir>`        | —     | Output directory                    | —       |
| `-s, --strategy <strategy>` | —     | Compression strategy                | `AUTO`  |
| `--convert`                 | —     | Enable opaque PNG to JPG conversion | `false` |
| `--no-cache`                | —     | Disable cache                       | `false` |
| `-k, --key <keys>`          | —     | Comma-separated API keys            | —       |
| `-p, --parallel <number>`   | —     | Parallel limit                      | `3`     |
| `--verbose`                 | —     | Show per-image compression details  | `false` |

### Commands

#### Default command (compress)

```bash
tinyimg src/assets/**
tinyimg src/assets/** -o dist/images
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY
tinyimg src/assets/** --convert
```

#### `tinyimg convert <paths>`

Convert PNGs without alpha to JPG.

- `--rename` — Rename `.png` to `.jpg`; the default keeps the filename and changes only the encoding

Example:

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --rename
```

#### `tinyimg keys <subcommand>`

Manage API keys.

- `tinyimg keys add <key>` — Add and verify an API key (supports multiple keys at once)
- `tinyimg keys del <maskedKey>` — Delete a saved key
- `tinyimg keys` (no subcommand) — List all keys

Example:

```bash
tinyimg keys add your_api_key
tinyimg keys add key1 key2 key3
tinyimg keys del xxxx...xxxx
tinyimg keys
```

#### `tinyimg list <paths>` (alias `ls`)

List image files with metadata.

- `--json` — Output as JSON
- `--convert` or `-c` — Show only convertible PNGs

Example:

```bash
tinyimg list src/assets/**
tinyimg ls src/assets/** -c
```

## Compression Strategies

- `API_ONLY`: Always use the TinyPNG API. Requires an API key.
- `RANDOM`: Randomly choose between the TinyPNG API and the web endpoint.
- `API_FIRST`: Prefer the TinyPNG API; fallback to the web endpoint when the API key is invalid or rate-limited.
- `AUTO`: Same as `API_FIRST` when an API key is available, otherwise falls back to `RANDOM`.

## API Key Setup

### Project-level keys

The CLI automatically reads `.env` and `.env.local` in the current working directory on startup.

Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS` (and any prefixed variant like `BUILD_TINYIMG_KEY` — matched by suffix).

Example `.env.local`:

```bash
TINYIMG_KEY=your_api_key
```

### User-level keys

Stored via `tinyimg keys add <key>` in `~/.tinyimg/keys.json`. Used as fallback when no project keys are available.

## License

[MIT](../../LICENSE)

## Cache and output behavior

Processed sources skip remote compression; explicitly requested PNG-to-JPG conversion is performed locally. `--no-cache` (CLI) or `noCache: true` (plugins) disables cache reads and writes, without forcing marked sources to be recompressed. Cache clearing preserves saved API keys. PNG-to-JPG conversion keeps the filename; it defaults to off for both the CLI and plugins. Use `--convert` (CLI) or `convertPngToJpg: true` (plugins) to enable it. Plugins report compression errors and keep the original asset. Saved user keys are disabled in plugins unless `USE_USER_TINYIMG_KEYS=true`.

## Compression logs

The CLI and plugins default to a start message, one summary and actionable errors. Eligible opaque PNGs trigger an info hint for `--convert` or `convertPngToJpg: true`, without guaranteeing a smaller output. The hint is suppressed when conversion is already enabled. Enable per-image, filename-sorted details with `--verbose` (CLI) or `verbose: true` (plugins). Empty builds stay quiet.

Plugins use native host logging: Vite `config.logger`, Webpack `compiler.getInfrastructureLogger('tinyimg')`, and Rsbuild `api.logger`, respecting host log levels.
