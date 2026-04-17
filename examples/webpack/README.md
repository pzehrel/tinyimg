# @pz4l/tinyimg-webpack Example

A minimal web project demonstrating the `tinyimg` Webpack plugin.

## Installation

```bash
npm install
```

## Production Build

```bash
npm run build
```

During the build, all emitted `png`, `jpg`, `jpeg`, `webp`, and `avif` assets will be compressed automatically. Check the terminal output for compression stats.

## Environment Variables

Create a `.env` file in the project root to configure API keys:

```env
TINYIMG_API_KEY=your_api_key_here
USE_USER_TINYIMG_KEYS=true
```
