# Core Package Examples

Comprehensive examples demonstrating how to use `@pz4l/tinyimg-core` for image compression.

## Prerequisites

- Node.js >= 18
- pnpm installed
- TinyPNG API key(s)

## Installation

```bash
cd examples/core-examples
pnpm install
```

## Environment Setup

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your TinyPNG API key(s):

```
TINYPNG_KEYS=your_api_key_here
```

For multiple keys (round-robin or priority strategies):

```
TINYPNG_KEYS=key1,key2,key3
```

## Running Examples

All examples can be run using npm scripts or directly with tsx:

### Using npm scripts (recommended)

```bash
# Basic compression - compress a single image
pnpm 01-basic

# Batch compression - compress multiple images with progress
pnpm 02-batch

# Cache management - inspect cache statistics
pnpm 03-cache

# Key pool strategies - compare different key selection strategies
pnpm 04-keypool
```

### Direct execution with tsx

```bash
npx tsx examples/01-basic-compression.ts
npx tsx examples/02-batch-compression.ts
npx tsx examples/03-cache-management.ts
npx tsx examples/04-key-pool-strategies.ts
```

## Examples

### 01 - Basic Compression

Demonstrates single image compression with cache integration and error handling.

**What you'll learn:**
- How to use `compressImage` API
- Cache hit/miss behavior
- Error handling for common scenarios

**Output:** `examples/output/sample.compressed.jpg`

### 02 - Batch Compression

Demonstrates concurrent batch compression with progress reporting.

**What you'll learn:**
- How to use `compressImages` for multiple files
- Concurrency control with the `concurrency` parameter
- Progress reporting during batch processing
- Aggregate statistics calculation

**Output:** Numbered files in `examples/output/` directory

### 03 - Cache Management

Demonstrates cache statistics retrieval and inspection.

**What you'll learn:**
- Two-level cache hierarchy (project + global)
- How to retrieve cache statistics
- Cache file inspection
- MD5-based caching explanation

### 04 - Key Pool Strategies

Demonstrates different API key selection strategies.

**What you'll learn:**
- Random strategy (default)
- Round-robin strategy
- Priority strategy (with custom weights)
- How to integrate custom KeyPool with compressImage

## Output Files

Compressed images are saved to `examples/output/`. To clean up:

```bash
rm -rf examples/output/*
```

## API Reference

For complete API documentation, see [`@pz4l/tinyimg-core`](../../packages/tinyimg-core/README.md).

## Troubleshooting

### "No valid API keys configured"

Ensure `.env` file exists with valid `TINYPNG_KEYS` value.

### "All API keys quota exhausted"

Your TinyPNG API keys have reached their monthly limit (500 images/key/month). Check usage at https://tinify.com/dashboard

### Type errors when running examples

This is expected - the examples import from the workspace package. Run with `tsx` or npm scripts, not with `ts-node` or `tsc`.

## License

MIT
