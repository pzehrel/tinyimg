import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadKeys } from '../config/loader'
import { ensureConfigFile, readConfig, writeConfig } from '../config/storage'

describe('config Management Integration', () => {
  const originalHome = process.env.HOME
  const originalEnv = process.env.TINYPNG_KEYS
  const testConfigDir = '.tinyimg-test-integration'

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
    // Restore original HOME
    process.env.HOME = originalHome
    // Restore original env var
    if (originalEnv !== undefined) {
      process.env.TINYPNG_KEYS = originalEnv
    }
    else {
      delete process.env.TINYPNG_KEYS
    }
  })

  describe('loadKeys behavior', () => {
    it('returns empty array when no keys configured', () => {
      const keys = loadKeys()
      expect(keys).toEqual([])
    })

    it('parses TINYPNG_KEYS environment variable', () => {
      const testKey = 'test_key_123456789012'
      process.env.TINYPNG_KEYS = testKey
      const keys = loadKeys()
      expect(keys).toHaveLength(1)
      expect(keys[0].key).toBe(testKey)
      delete process.env.TINYPNG_KEYS
    })

    it('splits comma-separated keys correctly', () => {
      const key1 = 'key1_1234567890123'
      const key2 = 'key2_1234567890123'
      process.env.TINYPNG_KEYS = `${key1},${key2}`
      const keys = loadKeys()
      expect(keys).toHaveLength(2)
      expect(keys[0].key).toBe(key1)
      expect(keys[1].key).toBe(key2)
      delete process.env.TINYPNG_KEYS
    })

    it('reads from config file', () => {
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
    })

    it('prioritizes env var over config file', () => {
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
      delete process.env.TINYPNG_KEYS
    })

    it('includes metadata from config file', () => {
      const configKey = 'config_key_123456'
      const lastCheck = '2026-03-23T10:00:00Z'
      const config = {
        keys: [
          { key: configKey, valid: true, lastCheck },
        ],
      }
      writeConfig(config as any)

      const keys = loadKeys()
      expect(keys).toHaveLength(1)
      expect(keys[0].key).toBe(configKey)
      expect(keys[0].valid).toBe(true)
      expect(keys[0].lastCheck).toBe(lastCheck)
    })
  })

  describe('config Storage behavior', () => {
    it('creates config file with correct structure', () => {
      ensureConfigFile()
      const configPath = `${testConfigDir}/.tinyimg/keys.json`
      expect(fs.existsSync(configPath)).toBe(true)

      const content = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content)
      expect(config.keys).toEqual([])
    })

    it('persists and reads config correctly', () => {
      const testConfig = {
        keys: [
          { key: 'test1', valid: true, lastCheck: '2026-03-23T10:00:00Z' },
          { key: 'test2', valid: false, lastCheck: '2026-03-23T11:00:00Z' },
        ],
      }
      writeConfig(testConfig as any)
      const read = readConfig()
      expect(read.keys).toHaveLength(2)
      expect(read.keys[0].key).toBe('test1')
      expect(read.keys[1].valid).toBe(false)
    })

    it('updates config file correctly', () => {
      // Write initial config
      const initialConfig = {
        keys: [
          { key: 'test1', valid: true, lastCheck: '2026-03-23T10:00:00Z' },
        ],
      }
      writeConfig(initialConfig as any)

      // Update config
      const updatedConfig = {
        keys: [
          { key: 'test1', valid: true, lastCheck: '2026-03-23T10:00:00Z' },
          { key: 'test2', valid: true, lastCheck: '2026-03-23T11:00:00Z' },
        ],
      }
      writeConfig(updatedConfig as any)

      const read = readConfig()
      expect(read.keys).toHaveLength(2)
      expect(read.keys[1].key).toBe('test2')
    })

    it('handles missing config directory gracefully', () => {
      // Ensure no config exists
      const configDir = `${testConfigDir}/.tinyimg`
      if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true })
      }

      // readConfig should create the config
      const config = readConfig()
      expect(config.keys).toEqual([])
      expect(fs.existsSync(`${configDir}/keys.json`)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty environment variable', () => {
      process.env.TINYPNG_KEYS = ''
      const keys = loadKeys()
      expect(keys).toEqual([])
      delete process.env.TINYPNG_KEYS
    })

    it('handles whitespace-only environment variable', () => {
      process.env.TINYPNG_KEYS = '   '
      const keys = loadKeys()
      expect(keys).toEqual([])
      delete process.env.TINYPNG_KEYS
    })

    it('handles keys with extra whitespace', () => {
      const key1 = 'key1_1234567890123'
      const key2 = 'key2_1234567890123'
      process.env.TINYPNG_KEYS = `  ${key1}  ,  ${key2}  `
      const keys = loadKeys()
      expect(keys).toHaveLength(2)
      expect(keys[0].key).toBe(key1)
      expect(keys[1].key).toBe(key2)
      delete process.env.TINYPNG_KEYS
    })

    it('handles multiple consecutive commas in env var', () => {
      process.env.TINYPNG_KEYS = 'key1,,,key2'
      const keys = loadKeys()
      expect(keys).toHaveLength(2)
      expect(keys[0].key).toBe('key1')
      expect(keys[1].key).toBe('key2')
      delete process.env.TINYPNG_KEYS
    })

    it('handles empty keys array in config', () => {
      const config = { keys: [] }
      writeConfig(config as any)
      const keys = loadKeys()
      expect(keys).toEqual([])
    })
  })
})
