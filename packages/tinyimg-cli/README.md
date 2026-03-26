# tinyimg-cli

Smart image compression CLI tool based on TinyPNG with multi-API key management, intelligent caching, and concurrent compression.

## Features

- **Batch Compression** - Supports files, directories, and glob patterns
- **Multi-API Key Management** - Smart rotation strategies to maximize free quota usage
- **Intelligent Caching** - MD5-based permanent cache to avoid redundant compression
- **Concurrency Control** - Configurable parallel compression tasks
- **Multiple Key Strategies** - Three modes: random, round-robin, priority
- **Fallback Strategy** - Automatic degradation to online compression when API key quota is exhausted

## Installation

### Global Installation (Recommended)

```bash
# Using npm
npm install -g tinyimg-cli

# Using pnpm
pnpm add -g tinyimg-cli

# Using yarn
yarn global add tinyimg-cli
```

### Local Installation

```bash
# Using npm
npm install -D tinyimg-cli

# Using pnpm
pnpm add -D tinyimg-cli

# Using yarn
yarn add -D tinyimg-cli
```

## Quick Start

```bash
# Add API Key
tinyimg key add YOUR_TINYPNG_API_KEY

# Compress all images in current directory
tinyimg *.png *.jpg

# Compress specified directory
tinyimg ./images/
```

## Usage

### Basic Compression Command

```bash
tinyimg [options] <input...>
```

**Input parameters support:**

- Single file: `image.png`
- Multiple files: `image1.png image2.jpg`
- Directory: `./images/`
- Glob pattern: `./assets/**/*.png`

### Command Options

| Option                    | Description                                          | Default  |
| ------------------------- | ----------------------------------------------------- | -------- |
| `-o, --output <dir>`      | Specify output directory                              | In-place |
| `-k, --key <key>`         | Specify API Key (higher priority than env variable)   | -        |
| `-m, --mode <mode>`       | Key usage strategy: `random` \| `round-robin` \| `priority` | `random` |
| `-p, --parallel <number>` | Concurrency limit                                     | `8`      |
| `-c, --cache`             | Enable cache                                          | `true`   |
| `--no-cache`              | Disable cache                                         | -        |
| `-h, --help`              | Show help information                                 | -        |

### Key Management Commands

```bash
# Add API Key
tinyimg key add <key>

# Remove API Key (interactive selection)
tinyimg key remove

# Remove specified API Key
tinyimg key remove <key>

# List all API Keys and quota information
tinyimg key
```

**Key Display Format:** API keys are displayed in a masked format (first 4 chars + last 4 chars, e.g., `abcd****efgh`) for easy identification while protecting sensitive information.

## Usage Examples

### Compress Single File

```bash
tinyimg photo.png
```

### Compress Multiple Files

```bash
tinyimg image1.png image2.jpg image3.jpeg
```

### Compress Entire Directory

```bash
tinyimg ./assets/images/
```

### Use Glob Pattern

```bash
# Compress all PNG files
tinyimg "./src/**/*.png"

# Compress multiple formats
tinyimg "./assets/**/*.{png,jpg,jpeg}"
```

### Specify Output Directory

```bash
# Compress to dist directory, preserve directory structure
tinyimg ./assets/ -o ./dist/

# Compress to specified directory
tinyimg photo.png -o ./compressed/
```

### Use Specific Key Strategy

```bash
# Round-robin mode (evenly distribute quota)
tinyimg ./images/ -m round-robin

# Priority mode (prefer specified key)
tinyimg ./images/ -m priority

# Random mode (default)
tinyimg ./images/ -m random
```

### Adjust Concurrency

```bash
# Lower concurrency (suitable for unstable network)
tinyimg ./images/ -p 4

# Higher concurrency (suitable for high-performance network)
tinyimg ./images/ -p 16
```

### Disable Cache

```bash
# Force re-compression of all images
tinyimg ./images/ --no-cache
```

### Specify API Key

```bash
# Use specific key for compression (highest priority)
tinyimg ./images/ -k YOUR_API_KEY
```

## Environment Variables

```bash
# Set API Keys (multiple keys separated by comma)
export TINYPNG_KEYS="key1,key2,key3"

# Run compression command
tinyimg ./images/
```

## Cache System

TinyImg uses a two-level cache system:

1. **Project-level cache** - `node_modules/.tinyimg_cache/` (priority)
2. **Global cache** - `~/.tinyimg/cache/` (fallback)

Cache is based on MD5 hash of file content. Files with same content will hit cache regardless of location.

## Supported Formats

- **PNG** - Including transparent PNG
- **JPG/JPEG** - All JPEG variants

> Note: TinyPNG does not support WebP, AVIF, SVG, or other formats.

## Quota Management

TinyPNG free tier provides 500 compressions per month. TinyImg maximizes utilization through:

- **Multi-Key Management** - Configure multiple keys for automatic rotation
- **Intelligent Caching** - Avoid re-compressing identical content
- **Quota Monitoring** - Real-time display of remaining quota for each key
- **Fallback Strategy** - Automatically use online compression when all keys are exhausted

## Error Handling

| Error Type                 | Description                   | Solution                              |
| --------------------------- | ------------------------------ | ------------------------------------- |
| `NoValidKeysError`          | No valid API Key configured   | Run `tinyimg key add <key>` to add key |
| `AllKeysExhaustedError`     | All keys quota exhausted      | Add new key or wait for monthly reset |
| `AllCompressionFailedError` | All compression methods failed | Check network connection and API status |

## Related Packages

- [tinyimg-core](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-core) - Core compression library
- [tinyimg-unplugin](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-unplugin) - Vite/Webpack/Rolldown plugin

## License

MIT
