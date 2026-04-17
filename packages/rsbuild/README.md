# @pzehrel/tinyimg-rsbuild

[![npm version](https://img.shields.io/npm/v/@pzehrel/tinyimg-rsbuild)](https://www.npmjs.com/package/@pzehrel/tinyimg-rsbuild)

TinyPNG image compression plugin for Rsbuild.

## Installation

```bash
npm i -D @pzehrel/tinyimg-rsbuild
```

## Usage

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import tinyimg from '@pzehrel/tinyimg-rsbuild'

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      maxFileSize: 5 * 1024 * 1024,
      convertPngToJpg: false,
      parallel: 3,
    }),
  ],
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| strategy | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'` | Compression strategy |
| maxFileSize | `number` | `5 * 1024 * 1024` | Max file size in bytes before local pre-compression |
| convertPngToJpg | `boolean` | `false` | Convert PNG without alpha to JPG |
| parallel | `number` | `3` | Max parallel compression count |

## Compression Strategies

- `API_ONLY`: always use TinyPNG API. Requires an API key.
- `RANDOM`: randomly choose between API and web compressor.
- `API_FIRST`: prefer API; fallback to web compressor on 401/429.
- `AUTO`: same as `API_FIRST` when an API key is available, otherwise `RANDOM`.

## API Key Setup

Set environment variable before building:

```bash
export TINYIMG_KEY=your_api_key
# Supported: TINYIMG_KEY, TINYIMG_KEYS, TINYPNG_KEY, TINYPNG_KEYS
```

Or use the CLI to manage user keys:

```bash
npx @pzehrel/tinyimg-cli keys add your_api_key
export USE_USER_TINYIMG_KEYS=true
```

## Example

See [`examples/rsbuild`](https://github.com/pzehrel/tinyimg/tree/main/examples/rsbuild) in the repo for a runnable example.

## License

[MIT](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)
