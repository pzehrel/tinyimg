import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadKeys } from '../config/loader'
import { writeConfig } from '../config/storage'

describe('key Loading', () => {
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
    }
    else {
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
        { key: configKey, valid: true, lastCheck: new Date().toISOString() },
      ],
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
        { key: configKey, valid: true, lastCheck: new Date().toISOString() },
      ],
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

describe('multi-variant environment variables', () => {
  const originalEnvs = {
    TINYIMG_KEYS: process.env.TINYIMG_KEYS,
    TINYIMG_KEY: process.env.TINYIMG_KEY,
    TINYPNG_KEYS: process.env.TINYPNG_KEYS,
    TINYPNG_KEY: process.env.TINYPNG_KEY,
  }
  const testConfigDir = '.tinyimg-test-loader-multi'

  beforeEach(() => {
    // Set up test config directory
    process.env.HOME = testConfigDir
    // Clean up any existing test config
    const configDir = `${testConfigDir}/.tinyimg`
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
    // Clear all env vars
    delete process.env.TINYIMG_KEYS
    delete process.env.TINYIMG_KEY
    delete process.env.TINYPNG_KEYS
    delete process.env.TINYPNG_KEY
  })

  afterEach(() => {
    // Clean up test config
    const configDir = `${testConfigDir}/.tinyimg`
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
    // Restore original env vars
    Object.entries(originalEnvs).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value
      }
      else {
        delete process.env[key]
      }
    })
  })

  it('should parse TINYIMG_KEYS environment variable', () => {
    const key1 = 'tinyimg_key1_1234567890123'
    const key2 = 'tinyimg_key2_1234567890123'
    process.env.TINYIMG_KEYS = `${key1},${key2}`
    const keys = loadKeys()
    expect(keys).toHaveLength(2)
    expect(keys[0].key).toBe(key1)
    expect(keys[1].key).toBe(key2)
  })

  it('should parse TINYIMG_KEY environment variable', () => {
    const testKey = 'tinyimg_key_123456789012'
    process.env.TINYIMG_KEY = testKey
    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(testKey)
  })

  it('should parse TINYPNG_KEYS environment variable', () => {
    const key1 = 'tinypng_key1_1234567890123'
    const key2 = 'tinypng_key2_1234567890123'
    process.env.TINYPNG_KEYS = `${key1},${key2}`
    const keys = loadKeys()
    expect(keys).toHaveLength(2)
    expect(keys[0].key).toBe(key1)
    expect(keys[1].key).toBe(key2)
  })

  it('should parse TINYPNG_KEY environment variable', () => {
    const testKey = 'tinypng_key_123456789012'
    process.env.TINYPNG_KEY = testKey
    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(testKey)
  })

  it('should respect priority order: TINYIMG_KEYS > TINYIMG_KEY > TINYPNG_KEYS > TINYPNG_KEY', () => {
    const tinyimgKeys = 'tinyimg_keys_1234567890123'
    const tinyimgKey = 'tinyimg_key_1234567890123'
    const tinypngKeys = 'tinypng_keys_1234567890123'
    const tinypngKey = 'tinypng_key_1234567890123'

    // Test 1: TINYIMG_KEYS has highest priority
    process.env.TINYIMG_KEYS = tinyimgKeys
    process.env.TINYIMG_KEY = tinyimgKey
    process.env.TINYPNG_KEYS = tinypngKeys
    process.env.TINYPNG_KEY = tinypngKey
    let keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(tinyimgKeys)

    // Test 2: TINYIMG_KEY is second priority
    delete process.env.TINYIMG_KEYS
    keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(tinyimgKey)

    // Test 3: TINYPNG_KEYS is third priority
    delete process.env.TINYIMG_KEY
    keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(tinypngKeys)

    // Test 4: TINYPNG_KEY is lowest priority
    delete process.env.TINYPNG_KEYS
    keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(tinypngKey)
  })

  it('should handle empty/whitespace env vars', () => {
    process.env.TINYIMG_KEYS = '   '
    process.env.TINYIMG_KEY = ''
    process.env.TINYPNG_KEYS = '\t\n'
    process.env.TINYPNG_KEY = '  \t  '
    const keys = loadKeys()
    expect(keys).toEqual([])
  })

  it('should fallback to config file when no env vars set', () => {
    const configKey = 'config_key_123456'
    const config = {
      keys: [
        { key: configKey, valid: true, lastCheck: new Date().toISOString() },
      ],
    }
    writeConfig(config as any)

    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(configKey)
    expect(keys[0].valid).toBe(true)
    expect(keys[0].lastCheck).toBeDefined()
  })

  it('should prioritize env vars over config file', () => {
    const envKey = 'env_key_1234567890'
    const configKey = 'config_key_123456'

    // Set up config file
    const config = {
      keys: [
        { key: configKey, valid: true, lastCheck: new Date().toISOString() },
      ],
    }
    writeConfig(config as any)

    // Set env var (TINYIMG_KEY should take priority)
    process.env.TINYIMG_KEY = envKey

    const keys = loadKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBe(envKey)
    expect(keys[0].valid).toBeUndefined()
  })
})
