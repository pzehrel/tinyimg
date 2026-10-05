# tinyimg

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-cli)](https://www.npmjs.com/package/@pz4l/tinyimg-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

[中文文档](./README.zh-CN.md)

TinyPNG image compression tool with multi-architecture support. Compress images via CLI or integrate directly into your build pipeline with Vite, Webpack, and Rsbuild plugins.

## Features

- **Multiple compression strategies** — choose between API-only, random, API-first fallback, or auto selection
- **Built-in cache** — stores compressed results locally in `node_modules/.tinyimg` or `~/.tinyimg` to avoid redundant processing
- **PNG-to-JPG conversion** — optionally convert PNGs without alpha channels to JPG for smaller file sizes
- **Parallel compression** — configurable concurrency for faster batch processing
- **Flexible API key management** — environment variables, user-level key storage, and automatic fallback handling

## Packages

Published packages:

- [`@pz4l/tinyimg-cli`](https://www.npmjs.com/package/@pz4l/tinyimg-cli) — CLI tool
- [`@pz4l/tinyimg-vite`](https://www.npmjs.com/package/@pz4l/tinyimg-vite) — Vite plugin
- [`@pz4l/tinyimg-webpack`](https://www.npmjs.com/package/@pz4l/tinyimg-webpack) — Webpack plugin
- [`@pz4l/tinyimg-rsbuild`](https://www.npmjs.com/package/@pz4l/tinyimg-rsbuild) — Rsbuild plugin

## CLI

### Installation

```bash
npm i -g @pz4l/tinyimg-cli
```

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

Convert PNGs without alpha channels to JPG.

- `--rename` — Rename `.png` to `.jpg`; the default keeps the filename and changes only the encoding

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --rename
```

#### `tinyimg keys <subcommand>`

Manage API keys.

- `tinyimg keys add <key>` — Add and verify an API key (supports multiple keys at once)
- `tinyimg keys del <maskedKey>` — Delete a saved key
- `tinyimg keys` (no subcommand) — List all keys

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

```bash
tinyimg list src/assets/**
tinyimg ls src/assets/** -c
```

## Plugin Quick Start

### Vite

```bash
npm i -D @pz4l/tinyimg-vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tinyimg from '@pz4l/tinyimg-vite'

export default defineConfig({
  plugins: [tinyimg()],
})
```

With options:

```ts
plugins: [
  tinyimg({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

### Webpack

```bash
npm i -D @pz4l/tinyimg-webpack
```

```ts
// webpack.config.ts
import TinyimgWebpackPlugin from '@pz4l/tinyimg-webpack'

export default {
  plugins: [new TinyimgWebpackPlugin()],
}
```

With options:

```ts
plugins: [
  new TinyimgWebpackPlugin({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

### Rsbuild

```bash
npm i -D @pz4l/tinyimg-rsbuild
```

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import tinyimg from '@pz4l/tinyimg-rsbuild'

export default defineConfig({
  plugins: [tinyimg()],
})
```

With options:

```ts
plugins: [
  tinyimg({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

## Options

All plugins share the following options:

| Option            | Type                                              | Default                 | Description                                |
| ----------------- | ------------------------------------------------- | ----------------------- | ------------------------------------------ |
| `strategy`        | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'`                | Compression strategy to use                |
| `maxFileSize`     | `number`                                          | `5 * 1024 * 1024` (5MB) | Maximum file size allowed for compression  |
| `convertPngToJpg` | `boolean`                                         | `false`                 | Convert PNGs without alpha channels to JPG |
| `parallel`        | `number`                                          | `3`                     | Number of concurrent compression tasks     |

## Compression Strategies

- `API_ONLY`: Always use the TinyPNG API. Requires an API key.
- `RANDOM`: Randomly choose between the TinyPNG API and the web endpoint.
- `API_FIRST`: Prefer the TinyPNG API; fallback to the web endpoint when the API key is invalid or rate-limited.
- `AUTO`: Same as `API_FIRST` when an API key is available, otherwise falls back to `RANDOM`.

## Environment Variables — CLI

The CLI reads API keys from two sources:

**Project-level keys** — The CLI automatically reads `.env` and `.env.local` in the current working directory on startup. Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS` (and any prefixed variant like `BUILD_TINYIMG_KEY` — matched by suffix).

**User-level keys** — Stored via `tinyimg keys add <key>` in `~/.tinyimg/keys.json`. Used as fallback when no project keys are available.

Example `.env.local`:

```bash
TINYIMG_KEY=your_api_key
```

## Environment Variables — Plugins

The Vite plugin loads `.env` files using the resolved `mode` and `envDir`. Webpack/Rsbuild plugins read `process.env`; their host configuration must load environment files. We recommend `.env.local` for local secrets (not committed to git).

Supported variable names: any ending with `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`.

Example for a build-only secret (do not use a VITE\_ prefix):

```bash
TINYIMG_KEY=your_api_key
```

## Examples

Runnable example projects are available in the repository:

- [`examples/vite`](./examples/vite)
- [`examples/webpack`](./examples/webpack)
- [`examples/rsbuild`](./examples/rsbuild)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commit conventions, and the PR process.

## License

MIT © [pzehrel](https://github.com/pzehrel)

## Cache and output behavior

Processed sources skip remote compression; explicitly requested PNG-to-JPG conversion is performed locally. `--no-cache` (CLI) or `noCache: true` (plugins) disables cache reads and writes, without forcing marked sources to be recompressed. Cache clearing preserves saved API keys. PNG-to-JPG conversion keeps the filename; it defaults to off for both the CLI and plugins. Use `--convert` (CLI) or `convertPngToJpg: true` (plugins) to enable it. Plugins report compression errors and keep the original asset. Saved user keys are disabled in plugins unless `USE_USER_TINYIMG_KEYS=true`.

## Converted file extensions

Plugins default to `renameConvertedFiles: false`, preserving filenames. Set both `convertPngToJpg: true` and `renameConvertedFiles: true` to emit converted opaque PNGs as `.jpg`, retaining the directory, basename and hash portion while updating JS/CSS/HTML/manifest references. Transparent PNGs and compression failures retain their names. Existing target names fail the build instead of overwriting assets. Renaming does not change the compression cache identity or enable conversion by itself.

```ts
tinyimg({
  convertPngToJpg: true,
  renameConvertedFiles: true,
})
```

## Compression logs

The CLI and plugins default to a start message, one summary and actionable errors. Eligible opaque PNGs trigger an info hint for `--convert` or `convertPngToJpg: true`, without guaranteeing a smaller output. The hint is suppressed when conversion is already enabled. Enable per-image, filename-sorted details with `--verbose` (CLI) or `verbose: true` (plugins). Empty builds stay quiet.

Plugins use native host logging: Vite `config.logger`, Webpack `compiler.getInfrastructureLogger('tinyimg')`, and Rsbuild `api.logger`, respecting host log levels.

## Host compiler versions

Plugins preserve existing peer minimums. Development and examples now use Vite 8.3.2, Webpack 5.111.1 and Rsbuild 2.2.11. See [host compatibility](docs/host-compatibility.md) for ranges, tested versions and Node requirements.
