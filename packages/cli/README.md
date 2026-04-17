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

Compress images:

```bash
tinyimg src/assets/**
tinyimg src/assets/** -o dist/images
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY
```

## CLI Options

| Option                      | Description                            |
| --------------------------- | -------------------------------------- |
| `-o, --output <dir>`        | Output directory                       |
| `-s, --strategy <strategy>` | Compression strategy (default: `AUTO`) |
| `--noCache`                 | Disable cache                          |
| `-k, --key <keys>`          | Comma-separated API keys               |
| `-p, --parallel <number>`   | Parallel limit (default: `3`)          |

## Subcommands

### `tinyimg convert <paths>`

Convert PNG to JPG (only for PNGs without alpha).

- `--noRename` — Keep original `.png` extension.

### `tinyimg keys add <key>`

Add and verify an API key.

### `tinyimg keys del`

Delete a saved key.

### `tinyimg list <paths>` (alias `ls`)

List image files.

## Compression Strategies

- `API_ONLY`: always use TinyPNG API. Requires an API key.
- `RANDOM`: randomly choose between API and web compressor.
- `API_FIRST`: prefer API; fallback to web compressor on 401/429.
- `AUTO`: same as `API_FIRST` when an API key is available, otherwise `RANDOM`.

## API Key Setup

Set an environment variable before running:

```bash
export TINYIMG_KEY=your_api_key
```

Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`.

Or use user-level keys:

```bash
tinyimg keys add your_api_key
export USE_USER_TINYIMG_KEYS=true
```

## License

[MIT](../../LICENSE)
