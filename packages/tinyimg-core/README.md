# tinyimg-core

Core library for TinyPNG image compression with intelligent caching and multi-API key management.

## Features

- Multi-API key management with smart rotation strategies
- MD5-based permanent caching system with two-level hierarchy
- Fallback strategies for quota exhaustion
- Concurrent compression with rate limiting
- Cache statistics for monitoring and CLI display

## Installation

```bash
npm install tinyimg-core
```

## Cache System

### Overview

TinyImg uses an MD5-based permanent cache for compressed images with two cache levels:

1. **Project Cache** (priority): `.node_modules/.tinyimg_cache/` - Relative to project root
2. **Global Cache** (fallback): `~/.tinyimg/cache/` - Shared across projects

The cache system provides:
- Automatic cache hit detection using MD5 content hashing
- Atomic writes for concurrent safety
- Graceful corruption handling (silent re-compression)
- Statistics reporting for CLI display

### API Reference

#### calculateMD5

Calculates MD5 hash of a file's content. Used as cache key for storing/retrieving compressed images.

```typescript
import { calculateMD5 } from 'tinyimg-core'

const hash = await calculateMD5('/path/to/image.png')
console.log(hash) // 'a1b2c3d4e5f6...'
```

**Parameters:**
- `imagePath: string` - Absolute path to the image file

**Returns:** `Promise<string>` - 32-character hexadecimal MD5 hash

**Note:** Same content produces same hash regardless of filename or location.

#### getProjectCachePath

Returns the path to the project-level cache directory.

```typescript
import { getProjectCachePath } from 'tinyimg-core'

const cachePath = getProjectCachePath('/Users/test/project')
// Returns: '/Users/test/project/.node_modules/.tinyimg_cache'
```

**Parameters:**
- `projectRoot: string` - Absolute path to the project root directory

**Returns:** `string` - Path to project cache directory

#### getGlobalCachePath

Returns the path to the global cache directory (shared across projects).

```typescript
import { getGlobalCachePath } from 'tinyimg-core'

const cachePath = getGlobalCachePath()
// Returns: '/Users/username/.tinyimg/cache'
```

**Returns:** `string` - Path to global cache directory

#### readCache

Reads cached compressed image from cache directories in priority order.

```typescript
import { readCache } from 'tinyimg-core'

const cached = await readCache('image.png', [
  getProjectCachePath('/project'),
  getGlobalCachePath()
])

if (cached) {
  console.log('Cache hit!')
} else {
  console.log('Cache miss')
}
```

**Parameters:**
- `imagePath: string` - Absolute path to the source image
- `cacheDirs: string[]` - Array of cache directories in priority order

**Returns:** `Promise<Buffer | null>` - Cached compressed data or null if miss

**Behavior:**
- Iterates through cache directories in order
- Returns first successful read
- Returns null if all caches miss or corrupted
- Silent failure - no errors thrown for missing/corrupted cache

#### writeCache

Writes compressed image data to cache using atomic write pattern.

```typescript
import { writeCache } from 'tinyimg-core'

const compressed = await compressImage(image)
await writeCache('image.png', compressed, getProjectCachePath('/project'))
```

**Parameters:**
- `imagePath: string` - Absolute path to the source image
- `data: Buffer` - Compressed image data to cache
- `cacheDir: string` - Cache directory to write to

**Behavior:**
- Uses atomic write (temp file + rename) for concurrent safety
- Auto-creates cache directory if needed
- Safe for concurrent writes from multiple processes

#### CacheStorage Class

Object-oriented interface for cache operations.

```typescript
import { CacheStorage } from 'tinyimg-core'

const storage = new CacheStorage('/path/to/cache')

// Get cache file path for an image
const cachePath = await storage.getCachePath('/path/to/image.png')

// Read from cache
const data = await storage.read('/path/to/image.png')

// Write to cache
await storage.write('/path/to/image.png', compressedData)
```

**Constructor:**
- `cacheDir: string` - Cache directory path

**Methods:**
- `async getCachePath(imagePath: string): Promise<string>` - Get cache file path
- `async read(imagePath: string): Promise<Buffer | null>` - Read cached data
- `async write(imagePath: string, data: Buffer): Promise<void>` - Write data to cache

#### getCacheStats

Returns cache statistics (file count and total size) for a directory.

```typescript
import { getCacheStats } from 'tinyimg-core'

const stats = await getCacheStats('/path/to/cache')
console.log(`Files: ${stats.count}, Size: ${formatBytes(stats.size)}`)
```

**Parameters:**
- `cacheDir: string` - Cache directory path

**Returns:** `Promise<CacheStats>` - Object with `count` and `size` (in bytes)

**Behavior:**
- Returns `{ count: 0, size: 0 }` for non-existent directories
- Handles errors gracefully (no exceptions thrown)

#### getAllCacheStats

Returns statistics for both project and global cache.

```typescript
import { getAllCacheStats } from 'tinyimg-core'

// Get both project and global stats
const stats = await getAllCacheStats('/project/path')
console.log(`Project: ${stats.project?.count} files`)
console.log(`Global: ${stats.global.count} files`)

// Get only global stats
const globalOnly = await getAllCacheStats()
console.log(`Global: ${globalOnly.global.count} files`)
```

**Parameters:**
- `projectRoot?: string` - Optional project root directory

**Returns:** `Promise<{ project: CacheStats | null, global: CacheStats }>` - Statistics object

**Behavior:**
- Project stats is `null` if no `projectRoot` provided
- Global stats always returned

#### formatBytes

Converts bytes to human-readable format for CLI display.

```typescript
import { formatBytes } from 'tinyimg-core'

formatBytes(0)        // "0 B"
formatBytes(512)      // "512 B"
formatBytes(1024)     // "1.00 KB"
formatBytes(1536)     // "1.50 KB"
formatBytes(1048576)  // "1.00 MB"
formatBytes(1073741824) // "1.00 GB"
```

**Parameters:**
- `bytes: number` - Number of bytes

**Returns:** `string` - Formatted string (e.g., "1.23 MB", "456 KB")

**Units:** B, KB, MB, GB (using 1024 as threshold)

### Usage Example

Complete example showing cache read/write pattern:

```typescript
import {
  readCache,
  writeCache,
  getProjectCachePath,
  getGlobalCachePath,
  getAllCacheStats,
  formatBytes
} from 'tinyimg-core'

async function compressWithCache(imagePath: string, projectRoot: string) {
  // Try to read from cache (project first, then global)
  const cached = await readCache(imagePath, [
    getProjectCachePath(projectRoot),
    getGlobalCachePath()
  ])

  if (cached) {
    console.log('Cache hit! Using compressed image.')
    return cached
  }

  // Cache miss - compress image
  console.log('Cache miss. Compressing image...')
  const compressed = await compressImage(imagePath)

  // Write to project cache
  await writeCache(imagePath, compressed, getProjectCachePath(projectRoot))

  return compressed
}

async function showCacheStats(projectRoot: string) {
  const stats = await getAllCacheStats(projectRoot)

  console.log('Cache Statistics:')
  console.log(`Project: ${stats.project?.count || 0} files, ${formatBytes(stats.project?.size || 0)}`)
  console.log(`Global: ${stats.global.count} files, ${formatBytes(stats.global.size)}`)
}
```

### Cache Behavior

**Cache Key:**
- MD5 hash of original image content
- Same content = same hash, regardless of filename/location

**Cache File:**
- Filename: MD5 hash (no extension)
- Content: Compressed image data (Buffer)

**Cache Policy:**
- No TTL - cache is permanent until manually cleaned
- Corrupted cache files handled gracefully (silent re-compression)
- Atomic writes prevent concurrent write corruption

**Cache Priority:**
1. Project cache checked first (fastest, project-specific)
2. Global cache checked second (shared, fallback)

**Storage Locations:**
- Project: `<projectRoot>/.node_modules/.tinyimg_cache/`
- Global: `~/.tinyimg/cache/`

## API Key Management

Coming soon in Phase 2 documentation.

## Error Handling

The cache system is designed to fail gracefully:
- Missing cache directory → Returns null (cache miss)
- Corrupted cache file → Returns null (triggers re-compression)
- Concurrent writes → Atomic write pattern prevents corruption
- Permission errors → Silent failure (logs warning)

## License

MIT
