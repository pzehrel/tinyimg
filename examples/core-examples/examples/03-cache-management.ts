#!/usr/bin/env tsx
/**
 * Cache Management Example
 *
 * This example demonstrates how to inspect and analyze the TinyImg cache system.
 *
 * Features demonstrated:
 * - Reading cache statistics (file count, total size)
 * - Understanding the two-level cache hierarchy
 * - Formatting bytes for human-readable display
 * - Comparing project vs global cache usage
 *
 * Cache Hierarchy:
 * 1. Project Cache (priority): node_modules/.tinyimg_cache/
 * 2. Global Cache (fallback): ~/.tinyimg/cache/
 *
 * Run with: pnpm 03-cache
 * Or directly: npx tsx examples/03-cache-management.ts
 */

import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  formatBytes,
  getAllCacheStats,
  getGlobalCachePath,
  getProjectCachePath,
} from '@pz4l/tinyimg-core'

// Paths relative to this example file
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')

interface CacheInfo {
  path: string
  exists: boolean
  stats?: { count: number, size: number }
  files?: string[]
}

async function inspectCacheDirectory(cachePath: string): Promise<CacheInfo> {
  const exists = existsSync(cachePath)

  if (!exists) {
    return { path: cachePath, exists: false }
  }

  const stats = await getAllCacheStats(PROJECT_ROOT)
  const files = await readdir(cachePath)

  // Determine which stats to use based on path
  let relevantStats
  if (cachePath.includes('node_modules')) {
    relevantStats = stats.project
  }
  else {
    relevantStats = stats.global
  }

  return {
    path: cachePath,
    exists: true,
    stats: relevantStats || { count: 0, size: 0 },
    files: files.slice(0, 10), // Show first 10 files
  }
}

async function main() {
  console.log('=== Cache Management Example ===\n')

  // Get cache paths
  const projectCachePath = getProjectCachePath(PROJECT_ROOT)
  const globalCachePath = getGlobalCachePath()

  console.log('Cache Paths:')
  console.log(`  Project: ${projectCachePath}`)
  console.log(`  Global:  ${globalCachePath}\n`)

  // Inspect project cache
  console.log('Project Cache (Priority):')
  console.log('  This cache is checked first during compression.')
  console.log('  Location: node_modules/.tinyimg_cache/')
  const projectInfo = await inspectCacheDirectory(projectCachePath)
  if (projectInfo.exists && projectInfo.stats) {
    console.log(`  Files: ${projectInfo.stats.count}`)
    console.log(`  Size: ${formatBytes(projectInfo.stats.size)}`)
    if (projectInfo.files && projectInfo.files.length > 0) {
      console.log(`  Sample files: ${projectInfo.files.slice(0, 5).join(', ')}${projectInfo.files.length > 5 ? '...' : ''}`)
    }
  }
  else {
    console.log('  Status: Empty or not found')
    console.log('  Run compression examples to populate cache!')
  }

  console.log()

  // Inspect global cache
  console.log('Global Cache (Fallback):')
  console.log('  This cache is checked if project cache misses.')
  console.log('  Location: ~/.tinyimg/cache/')
  console.log('  Shared across all TinyImg projects.')
  const globalInfo = await inspectCacheDirectory(globalCachePath)
  if (globalInfo.exists && globalInfo.stats) {
    console.log(`  Files: ${globalInfo.stats.count}`)
    console.log(`  Size: ${formatBytes(globalInfo.stats.size)}`)
    if (globalInfo.files && globalInfo.files.length > 0) {
      console.log(`  Sample files: ${globalInfo.files.slice(0, 5).join(', ')}${globalInfo.files.length > 5 ? '...' : ''}`)
    }
  }
  else {
    console.log('  Status: Empty or not found')
  }

  console.log()

  // Get combined statistics
  const stats = await getAllCacheStats(PROJECT_ROOT)

  console.log('=== Cache Statistics Summary ===')
  console.log(`Project cache: ${stats.project?.count || 0} files (${formatBytes(stats.project?.size || 0)})`)
  console.log(`Global cache:  ${stats.global.count} files (${formatBytes(stats.global.size)})`)

  const totalFiles = (stats.project?.count || 0) + stats.global.count
  const totalSize = (stats.project?.size || 0) + stats.global.size

  console.log(`Total:         ${totalFiles} files (${formatBytes(totalSize)})`)

  console.log()

  // Demonstrate formatBytes utility
  console.log('=== Byte Formatting Examples ===')
  console.log('The formatBytes utility converts raw bytes to human-readable format:')
  console.log(`  0 bytes → "${formatBytes(0)}"`)
  console.log(`  512 bytes → "${formatBytes(512)}"`)
  console.log(`  1024 bytes → "${formatBytes(1024)}"`)
  console.log(`  1048576 bytes → "${formatBytes(1048576)}"`)
  console.log(`  1073741824 bytes → "${formatBytes(1073741824)}"`)

  console.log()

  // Cache behavior explanation
  console.log('=== Cache Behavior ===')
  console.log('When compressing an image:')
  console.log('  1. Calculate MD5 hash of original image')
  console.log('  2. Check project cache for hash match')
  console.log('  3. If miss, check global cache')
  console.log('  4. If both miss, compress and write to project cache')
  console.log('\nBenefits:')
  console.log('  - Permanent cache (no TTL)')
  console.log('  - Content-based (same image = same cache key)')
  console.log('  - Two-level hierarchy for optimal performance')
}

main()
