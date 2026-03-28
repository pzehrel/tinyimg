# Rolldown Example for @pz4l/tinyimg-unplugin

This example demonstrates how to use @pz4l/tinyimg-unplugin with Rolldown.

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

**Note:** Rolldown does not automatically load `.env` files. This example uses:

- `dotenv` package to load `.env` file into `process.env`
- `@rollup/plugin-replace` to inject `process.env.TINYPNG_KEYS` into the bundle

The `replace` plugin MUST be placed first in the plugins array for proper dead code elimination.

## Usage

**Build for production:**

```bash
pnpm build
```

## Expected Output

After running `pnpm build`, check `dist/` for compressed images.

## Troubleshooting

- **Images not compressing:** Verify TINYPNG_KEYS is set in .env file and both dotenv and @rollup/plugin-replace are configured
- **Build errors:** Check that @pz4l/tinyimg-unplugin, @rollup/plugin-replace, and dotenv are installed
- **process is not defined errors:** Ensure @rollup/plugin-replace is placed BEFORE tinyimg in plugins array
- **API quota exceeded:** TinyPNG free tier is 500 images/month per key
