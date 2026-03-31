# Core Package Examples for @pz4l/tinyimg-core

This directory contains runnable examples demonstrating the features of `@pz4l/tinyimg-core`, the core library for TinyPNG image compression with intelligent caching and multi-API key management.

## Prerequisites

- Node.js >= 18
- pnpm
- TinyPNG API key(s) from [https://tinypng.com/developers](https://tinypng.com/developers)

## Installation

```bash
pnpm install
```

## Environment Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Add your TinyPNG API key(s) to `.env`:

```
TINYPNG_KEYS=your_api_key_here
```

**Multiple keys:** Separate with commas for round-robin distribution:

```
TINYPNG_KEYS=key1,key2,key3
```

## Examples

### 01: Basic Compression

Demonstrates single image compression with caching and error handling.

**Run:** `pnpm 01-basic`

**What you'll learn:**
- Using `compressImage` API
- Reading and writing image files
- Calculating compression savings
- Handling common errors (NoValidKeysError, AllKeysExhaustedError, AllCompressionFailedError)

**Output:** `examples/output/sample-compressed.jpg`

### 02: Batch Compression

Demonstrates concurrent compression of multiple images with progress reporting.

**Run:** `pnpm 02-batch`

**What you'll learn:**
- Using `compressImages` API for batch processing
- Controlling concurrency for rate-limited APIs
- Progress reporting during batch operations
- Aggregate compression statistics

**Output:** `examples/output/batch-compressed-0.jpg`, `batch-compressed-1.png`

### 03: Cache Management

Demonstrates cache inspection and statistics retrieval.

**Run:** `pnpm 03-cache`

**What you'll learn:**
- Using `getAllCacheStats` to read cache statistics
- Understanding the two-level cache hierarchy
- Using `formatBytes` for human-readable display
- Project cache vs global cache behavior

**Output:** Console statistics (no files created)

### 04: Key Pool Strategies

Demonstrates the three API key selection strategies.

**Run:** `pnpm 04-keypool`

**What you'll learn:**
- Creating `KeyPool` with different strategies
- Random vs round-robin vs priority key selection
- Custom KeyPool usage with `compressImage`
- When to use each strategy

**Output:** Console demonstration (no files created)

## Running Examples Directly

Each example file includes a shebang for direct execution with `tsx`:

```bash
npx tsx examples/01-basic-compression.ts
npx tsx examples/02-batch-compression.ts
npx tsx examples/03-cache-management.ts
npx tsx examples/04-key-pool-strategies.ts
```

## API Reference

For complete API documentation, see [`@pz4l/tinyimg-core` README](../../packages/tinyimg-core/README.md).

### Key APIs Demonstrated

- **compressImage**: Compress a single image with caching
- **compressImages**: Compress multiple images with concurrency control
- **KeyPool**: Manage multiple API keys with rotation strategies
- **getAllCacheStats**: Get cache statistics for project and global cache
- **formatBytes**: Convert bytes to human-readable format

## Troubleshooting

### "No API keys configured"

Set the `TINYPNG_KEYS` environment variable:

```bash
export TINYPNG_KEYS=your_api_key_here
pnpm 01-basic
```

Or create a `.env` file:

```bash
echo "TINYPNG_KEYS=your_api_key_here" > .env
```

### "All API keys exhausted"

The free TinyPNG tier allows 500 compressions per key per month. Options:

1. Wait for quota reset (monthly)
2. Add more API keys (comma-separated)
3. The example will fall back to the web compressor

### Images not compressing

- Verify API key is valid: `curl https://api.tinify.com/shrink --user api:YOUR_KEY`
- Check network connectivity
- Ensure test fixtures exist at `packages/tinyimg-unplugin/test/fixtures/images/`

### Permission errors

Some examples write to `examples/output/`. Ensure directory exists:

```bash
mkdir -p examples/output
```

## Output Files

Compressed images are saved to `examples/output/`. This directory is gitignored to prevent committing large files.

To clean output:

```bash
rm -rf examples/output/*
```

## Next Steps

- Explore the [`@pz4l/tinyimg-core` source code](../../packages/tinyimg-core/src/)
- Try the [CLI tool](../../packages/tinyimg-cli/) for command-line usage
- Integrate with your build tool using [`@pz4l/tinyimg-unplugin`](../vite-example/)
