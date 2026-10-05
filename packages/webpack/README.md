# @pz4l/tinyimg-webpack

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-webpack)](https://www.npmjs.com/package/@pz4l/tinyimg-webpack)

TinyPNG image compression plugin for Webpack.

Peer dependency: `webpack ^5.0.0`

## Installation

```bash
npm i -D @pz4l/tinyimg-webpack
```

## Usage

Zero-config usage:

```ts
// webpack.config.ts
import TinyimgWebpackPlugin from '@pz4l/tinyimg-webpack'

export default {
  plugins: [new TinyimgWebpackPlugin()],
}
```

With options:

```ts
// webpack.config.ts
import TinyimgWebpackPlugin from '@pz4l/tinyimg-webpack'

export default {
  // ...other config
  plugins: [
    new TinyimgWebpackPlugin({
      strategy: 'AUTO',
      maxFileSize: 5 * 1024 * 1024,
      convertPngToJpg: false,
      parallel: 3,
    }),
  ],
}
```

## Options

| Option          | Type                                              | Default           | Description                                         |
| --------------- | ------------------------------------------------- | ----------------- | --------------------------------------------------- |
| strategy        | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'`          | Compression strategy                                |
| maxFileSize     | `number`                                          | `5 * 1024 * 1024` | Max file size in bytes before local pre-compression |
| convertPngToJpg | `boolean`                                         | `false`           | Convert PNG without alpha to JPG                    |
| parallel        | `number`                                          | `3`               | Max parallel compression count                      |

## Compression Strategies

- `API_ONLY`: Always use the TinyPNG API. Requires an API key.
- `RANDOM`: Randomly choose between the TinyPNG API and the web endpoint.
- `API_FIRST`: Prefer the TinyPNG API; fallback to the web endpoint when the API key is invalid or rate-limited.
- `AUTO`: Same as `API_FIRST` when an API key is available, otherwise falls back to `RANDOM`.

## API Key Setup

Plugins do not read `.env` files themselves; the build tool (Webpack) loads them. It is recommended to use `.env.local` for local secrets.

Supported variable names: any ending with `TINYIMG_KEY`, `TINYIMG_KEYS`, `TINYPNG_KEY`, `TINYPNG_KEYS`. You can also add a prefix, e.g. `APP_TINYIMG_KEY`.

Example:

```bash
TINYIMG_KEY=your_api_key
```

## Example

See [`examples/webpack`](https://github.com/pzehrel/tinyimg/tree/main/examples/webpack) in the repo for a runnable example.

## License

[MIT](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)

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

## Host version compatibility

Development and examples use updated stable hosts while preserving the existing minimum peer versions. See [host compatibility](../../docs/host-compatibility.md) for ranges, tested versions and Node requirements.
