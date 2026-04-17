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
