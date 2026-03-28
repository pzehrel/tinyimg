# Webpack Example for @pz4l/tinyimg-unplugin

This example demonstrates how to use @pz4l/tinyimg-unplugin with Webpack.

## Prerequisites

- Node.js >= 18
- pnpm

## Installation

```bash
pnpm install
```

## Environment Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Get your TinyPNG API key from https://tinypng.com/developers

3. Add your API key to `.env`:

```
TINYPNG_KEYS=your_api_key_here
```

**Note:** Unlike Vite, Webpack does not automatically load `.env` files. This example uses the `dotenv-webpack` plugin to load environment variables.

## Usage

**Build for production:**

```bash
pnpm build
```

## Expected Output

After running `pnpm build`, check `dist/` for compressed images.

## Troubleshooting

- **Images not compressing:** Verify TINYPNG_KEYS is set in .env file and dotenv-webpack is configured
- **Build errors:** Check that @pz4l/tinyimg-unplugin and dotenv-webpack are installed
- **API quota exceeded:** TinyPNG free tier is 500 images/month per key
