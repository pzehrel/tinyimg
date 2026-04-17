# tinyimg

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-cli)](https://www.npmjs.com/package/@pz4l/tinyimg-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

[中文文档](./README.zh-CN.md)

TinyPNG image compression tool with multi-architecture support. Compress images via CLI or integrate directly into your build pipeline with Vite, Webpack, and Rsbuild plugins.

## Features

- **Multiple compression strategies** — choose between API-only, web-only, API-first fallback, random, or auto selection
- **Built-in cache** — stores compressed results locally in `node_modules/.tinyimg` or `~/.tinyimg` to avoid redundant processing
- **PNG-to-JPG conversion** — optionally convert PNGs without alpha channels to JPG for smaller file sizes
- **Parallel compression** — configurable concurrency for faster batch processing
- **Flexible API key management** — environment variables, user-level key storage, and automatic fallback handling

## Packages

| Package                                                                        | Description                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [`@pz4l/tinyimg-cli`](https://www.npmjs.com/package/@pz4l/tinyimg-cli)         | CLI tool for compressing images from the command line |
| [`@pz4l/tinyimg-vite`](https://www.npmjs.com/package/@pz4l/tinyimg-vite)       | Vite plugin                                           |
| [`@pz4l/tinyimg-webpack`](https://www.npmjs.com/package/@pz4l/tinyimg-webpack) | Webpack plugin                                        |
| [`@pz4l/tinyimg-rsbuild`](https://www.npmjs.com/package/@pz4l/tinyimg-rsbuild) | Rsbuild plugin                                        |

Internal packages: `@pz4l/tinyimg-core`, `@pz4l/tinyimg-locale`

## Installation

### CLI

```bash
npm i -g @pz4l/tinyimg-cli
```

### Plugins

```bash
npm i -D @pz4l/tinyimg-vite
npm i -D @pz4l/tinyimg-webpack
npm i -D @pz4l/tinyimg-rsbuild
```

## CLI Quick Start

```bash
tinyimg src/assets/**
```

With options:

```bash
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY -o dist/images
```

### Subcommands

- `tinyimg convert <paths>` — convert PNGs to JPGs without alpha channels
- `tinyimg keys add <key>` — add a user-level API key
- `tinyimg keys del` — delete user-level API keys
- `tinyimg list <paths>` (alias `ls`) — list image files with metadata

## Plugin Quick Start

### Vite

```ts
import { defineConfig } from 'vite'
import tinyimg from '@pz4l/tinyimg-vite'

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
})
```

### Webpack

```ts
import TinyimgWebpackPlugin from '@pz4l/tinyimg-webpack'

export default {
  plugins: [
    new TinyimgWebpackPlugin({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
}
```

### Rsbuild

```ts
import { defineConfig } from '@rsbuild/core'
import tinyimg from '@pz4l/tinyimg-rsbuild'

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
})
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
- `RANDOM`: Randomly choose between the TinyPNG API and the web compressor.
- `API_FIRST`: Prefer the TinyPNG API; fallback to the web compressor on `401` or `429` errors.
- `AUTO`: Same as `API_FIRST` when an API key is available, otherwise falls back to `RANDOM`.

## API Key Setup

Set an environment variable before running:

```bash
export TINYIMG_KEY=your_api_key
```

Supported variable names: `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`

Or use user-level keys:

```bash
tinyimg keys add your_api_key
export USE_USER_TINYIMG_KEYS=true
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
