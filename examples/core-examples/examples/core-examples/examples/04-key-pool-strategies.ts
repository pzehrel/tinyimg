#!/usr/bin/env tsx
/**
 * Key Pool Strategy Example
 *
 * This example demonstrates the three API key selection strategies available
 * in @pz4l/tinyimg-core's KeyPool.
 *
 * Features demonstrated:
 * - Creating KeyPool instances with different strategies
 * - Random key selection (default)
 * - Round-robin key selection
 * - Priority-based key selection
 * - Manual key selection for advanced scenarios
 *
 * Strategies:
 * 1. random: Randomly select from available keys (default)
 * 2. round-robin: Cycle through keys in order
 * 3. priority: Prefer API keys, track quota usage
 *
 * Run with: pnpm 04-keypool
 * Or directly: npx tsx examples/04-key-pool-strategies.ts
 */

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AllKeysExhaustedError,
  KeyPool,
  maskKey,
  NoValidKeysError,
} from '@pz4l/tinyimg-core'

// Paths relative to this example file
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Simulate key selection to demonstrate strategy behavior
 * In production, KeyPool is used internally by compressImage
 */
async function demonstrateRandomStrategy(): Promise<void> {
  console.log('\n### Random Strategy ###')
  console.log('Randomly selects from available API keys.')
  console.log('Best for: Distributing load evenly across multiple keys\n')

  try {
    const pool = new KeyPool('random')
    console.log('KeyPool created with random strategy')

    // Simulate multiple selections
    console.log('\nSimulating 5 key selections:')
    const selections: string[] = []
    for (let i = 0; i < 5; i++) {
      const key = await pool.selectKey()
      const masked = maskKey(key)
      selections.push(masked)
      console.log(`  Selection ${i + 1}: ${masked}`)
    }

    const uniqueKeys = new Set(selections)
    console.log(`\nUnique keys selected: ${uniqueKeys.size}`)
    console.log('Note: Random selection may pick the same key multiple times')
  }
  catch (error) {
    if (error instanceof NoValidKeysError) {
      console.log('⚠ No API keys configured. Set TINYPNG_KEYS to test this example.')
    }
    else {
      console.error('Error:', error)
    }
  }
}

async function demonstrateRoundRobinStrategy(): Promise<void> {
  console.log('\n### Round-Robin Strategy ###')
  console.log('Cycles through keys in predictable order.')
  console.log('Best for: Predictable key rotation and quota management\n')

  try {
    const pool = new KeyPool('round-robin')
    console.log('KeyPool created with round-robin strategy')

    // Simulate multiple selections
    console.log('\nSimulating 5 key selections:')
    for (let i = 0; i < 5; i++) {
      const key = await pool.selectKey()
      const masked = maskKey(key)
      console.log(`  Selection ${i + 1}: ${masked}`)
    }

    console.log('\nNote: Keys are selected in order, cycling back to the first')
  }
  catch (error) {
    if (error instanceof NoValidKeysError) {
      console.log('⚠ No API keys configured. Set TINYPNG_KEYS to test this example.')
    }
    else {
      console.error('Error:', error)
    }
  }
}

async function demonstratePriorityStrategy(): Promise<void> {
  console.log('\n### Priority Strategy ###')
  console.log('Prefers API keys with quota, tracks usage.')
  console.log('Best for: Ensuring keys are used evenly before exhausting\n')

  try {
    const pool = new KeyPool('priority')
    console.log('KeyPool created with priority strategy')

    // Get initial key
    const key1 = await pool.selectKey()
    console.log(`\nInitial selection: ${maskKey(key1)}`)

    // Simulate quota decrement
    pool.decrementQuota()
    console.log('Quota decremented for current key')

    // In priority mode, the pool will try to reuse the current key
    // until its quota is exhausted, then select the next available key
    const key2 = await pool.selectKey()
    console.log(`Next selection: ${maskKey(key2)}`)

    console.log('\nNote: Priority strategy tracks quota and switches keys when needed')
  }
  catch (error) {
    if (error instanceof NoValidKeysError) {
      console.log('⚠ No API keys configured. Set TINYPNG_KEYS to test this example.')
    }
    else if (error instanceof AllKeysExhaustedError) {
      console.log('⚠ All API keys exhausted. Need to add more keys or wait for reset.')
    }
    else {
      console.error('Error:', error)
    }
  }
}

async function demonstrateCustomKeyPool(): Promise<void> {
  console.log('\n### Custom KeyPool Usage ###')
  console.log('You can pass a custom KeyPool to compressImage for advanced scenarios.\n')

  try {
    // Create a custom KeyPool with specific strategy
    const pool = new KeyPool('round-robin')
    console.log('Custom KeyPool created (round-robin)')

    // Get the current key without decrementing quota
    const currentKey = pool.getCurrentKey()
    console.log(`Current key: ${currentKey ? maskKey(currentKey) : 'None selected yet'}`)

    // Select a key
    const selectedKey = await pool.selectKey()
    console.log(`Selected key: ${maskKey(selectedKey)}`)

    console.log('\nIn production, pass custom KeyPool to compressImage:')
    console.log('```typescript')
    console.log('const pool = new KeyPool("round-robin")')
    console.log('const compressed = await compressImage(buffer, {')
    console.log('  keyPool: pool,  // Use custom pool instead of default')
    console.log('})')
    console.log('```')
  }
  catch (error) {
    if (error instanceof NoValidKeysError) {
      console.log('⚠ No API keys configured. Set TINYPNG_KEYS to test this example.')
    }
    else {
      console.error('Error:', error)
    }
  }
}

function printStrategyComparison(): void {
  console.log('\n=== Strategy Comparison ===')
  console.log('')
  console.log('Strategy      | Description                          | Use Case')
  console.log('--------------|--------------------------------------|------------------------------------')
  console.log('random        | Random selection from available keys  | Even load distribution')
  console.log('round-robin   | Sequential cycling through keys       | Predictable rotation')
  console.log('priority      | Track quota, reuse current key        | Maximize quota utilization')
  console.log('')
  console.log('Choosing a strategy:')
  console.log('- Use "random" (default) for most scenarios')
  console.log('- Use "round-robin" when you want predictable key rotation')
  console.log('- Use "priority" when managing quotas across multiple keys')
}

async function main() {
  console.log('=== Key Pool Strategy Example ===')
  console.log('')
  console.log('This example demonstrates the three API key selection strategies.')
  console.log('')
  console.log('Note: This example requires API keys to demonstrate behavior.')
  console.log('Set TINYPNG_KEYS environment variable with comma-separated keys.')
  console.log('Example: TINYPNG_KEYS=key1,key2,key3 pnpm 04-keypool')

  // Check if keys are configured
  const hasKeys = process.env.TINYPNG_KEYS?.length > 0

  if (!hasKeys) {
    console.log('\n⚠ No API keys detected. Showing example behavior with mock data.\n')
    console.log('To see actual behavior, configure API keys and run again.')
  }

  // Demonstrate each strategy
  await demonstrateRandomStrategy()
  await demonstrateRoundRobinStrategy()
  await demonstratePriorityStrategy()
  await demonstrateCustomKeyPool()

  // Print comparison table
  printStrategyComparison()

  console.log('\n=== Integration with compressImage ===')
  console.log('')
  console.log('By default, compressImage uses a KeyPool with "random" strategy.')
  console.log('You can customize this by passing a KeyPool instance:')
  console.log('')
  console.log('```typescript')
  console.log('import { compressImage, KeyPool } from "@pz4l/tinyimg-core"')
  console.log('')
  console.log('// Create custom pool')
  console.log('const pool = new KeyPool("round-robin")')
  console.log('')
  console.log('// Use with compressImage')
  console.log('const compressed = await compressImage(buffer, {')
  console.log('  keyPool: pool,  // Custom key management')
  console.log('  mode: "auto",')
  console.log('  cache: true,')
  console.log('})')
  console.log('```')
}

main()
