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

| Option                      | Alias | Description              | Default |
| --------------------------- | ----- | ------------------------ | ------- |
| `-o, --output <dir>`        | —     | Output directory         | —       |
| `-s, --strategy <strategy>` | —     | Compression strategy     | `AUTO`  |
| `--no-cache`                | —     | Disable cache            | `false` |
| `-k, --key <keys>`          | —     | Comma-separated API keys | —       |
| `-p, --parallel <number>`   | —     | Parallel limit           | `3`     |

### Commands

#### Default command (compress)

```bash
tinyimg src/assets/**
tinyimg src/assets/** -o dist/images
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY
```

#### `tinyimg convert <paths>`

Convert PNGs without alpha to JPG.

- `--noRename` — Keep original `.png` extension (only changes encoding)

Example:

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --noRename
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

Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS` (and any prefixed variant like `VITE_TINYIMG_KEY` — matched by suffix).

Example `.env.local`:

```bash
TINYIMG_KEY=your_api_key
```

### User-level keys

Stored via `tinyimg keys add <key>` in `~/.tinyimg/keys.json`. Used as fallback when no project keys are available.

## License

[MIT](../../LICENSE)
