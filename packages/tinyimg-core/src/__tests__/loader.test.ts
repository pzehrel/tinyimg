import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadKeys } from '../config/loader.js'
import { writeConfig } from '../config/storage.js'
import fs from 'node:fs'

describe('Key Loading', () => {
  const originalEnv = process.env.TINYPNG_KEYS
  const testConfigDir = '.tinyimg-test-loader'

  beforeEach(() => {
    // Set up test config directory
    process.env.HOME = testConfigDir
    // Clean up any existing test config
    const configDir = `${testConfigDir}/.tinyimg`
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
    // Clear env var
    delete process.env.TINYPNG_KEYS
  })

  afterEach(() => {
    // Clean up test config
    const configDir = `${testConfigDir}/.tinyimg`
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
    // Restore original env var
    if (originalEnv !== undefined) {
      process.env.TINYPNG_KEYS = originalEnv
    } else {
      delete process.env.TINYPNG_KEYS
    }
  })

  it('should return empty array when no keys configured', () => {
    const keys = loadKeys()
    expect(keys).toEqual([])
  })

  it('should parse TINYPNG_KEYS environment variable', () => {
    const testKey = 'test_key_123456789012'
    process.env.TINYPNG_KEYS = testKey
    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(testKey)
  })

  it('should split comma-separated keys', () => {
    const key1 = 'key1_1234567890123'
    const key2 = 'key2_1234567890123'
    process.env.TINYPNG_KEYS = `${key1},${key2}`
    const keys = loadKeys()
    expect(keys).toHaveLength(2)
    expect(keys[0].key).toBe(key1)
    expect(keys[1].key).toBe(key2)
  })

  it('should trim whitespace from keys', () => {
    const key1 = 'key1_1234567890123'
    const key2 = 'key2_1234567890123'
    process.env.TINYPNG_KEYS = ` ${key1} , ${key2} `
    const keys = loadKeys()
    expect(keys).toHaveLength(2)
    expect(keys[0].key).toBe(key1)
    expect(keys[1].key).toBe(key2)
  })

  it('should read from config file', () => {
    const configKey = 'config_key_123456'
    const config = {
      keys: [
        { key: configKey, valid: true, lastCheck: new Date().toISOString() }
      ]
    }
    writeConfig(config as any)

    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(configKey)
    expect(keys[0].valid).toBe(true)
    expect(keys[0].lastCheck).toBeDefined()
  })

  it('should prioritize env var over config file', () => {
    const envKey = 'env_key_1234567890'
    const configKey = 'config_key_123456'

    // Set up config file
    const config = {
      keys: [
        { key: configKey, valid: true, lastCheck: new Date().toISOString() }
      ]
    }
    writeConfig(config as any)

    // Set env var
    process.env.TINYPNG_KEYS = envKey

    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(envKey)
    expect(keys[0].valid).toBeUndefined()
  })

  it('should filter empty keys', () => {
    process.env.TINYPNG_KEYS = 'key1,,key2,'
    const keys = loadKeys()
    expect(keys).toHaveLength(2)
    expect(keys[0].key).toBe('key1')
    expect(keys[1].key).toBe('key2')
  })
})
