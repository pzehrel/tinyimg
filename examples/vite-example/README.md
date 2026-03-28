# Vite Example for @pz4l/tinyimg-unplugin

This example demonstrates how to use @pz4l/tinyimg-unplugin with Vite.

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

**Note:** Vite automatically loads `.env` files. No additional configuration needed.

## Usage

**Development mode:**

```bash
pnpm dev
```

**Build for production:**

```bash
pnpm build
```

**Preview production build:**

```bash
pnpm preview
```

## Expected Output

After running `pnpm build`, check `dist/assets/` for compressed images. The plugin only runs during production builds, not in dev mode.

## Troubleshooting

- **Images not compressing:** Verify TINYPNG_KEYS is set in .env file
- **Build errors:** Check that @pz4l/tinyimg-unplugin is installed
- **API quota exceeded:** TinyPNG free tier is 500 images/month per key
