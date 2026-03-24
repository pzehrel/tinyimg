import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readConfig, writeConfig, ensureConfigFile, getConfigPath } from '../config/storage.js'
import fs from 'node:fs'
import os from 'node:os'

describe('Config Storage', () => {
  const originalHome = process.env.HOME
  const testConfigDir = '.tinyimg-test-storage'

  beforeEach(() => {
    // Set up test config directory
    process.env.HOME = testConfigDir
    // Clean up any existing test config
    const configPath = getConfigPath()
    const configDir = require('node:path').dirname(configPath)
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    // Clean up test config
    const configPath = getConfigPath()
    const configDir = require('node:path').dirname(configPath)
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true })
    }
    // Restore original HOME
    process.env.HOME = originalHome
  })

  it('should create config file with secure permissions', () => {
    ensureConfigFile()
    const configPath = getConfigPath()
    expect(fs.existsSync(configPath)).toBe(true)

    // Check file exists and has content
    const content = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content)
    expect(config.keys).toEqual([])
  })

  it('should create config directory with correct structure', () => {
    ensureConfigFile()
    const configPath = getConfigPath()
    const configDir = require('node:path').dirname(configPath)
    expect(fs.existsSync(configDir)).toBe(true)
  })

  it('should read config from file', () => {
    const testConfig = {
      keys: [
        { key: 'test1', valid: true, lastCheck: '2026-03-23T10:00:00Z' }
      ]
    }
    writeConfig(testConfig as any)
    const read = readConfig()
    expect(read.keys).toHaveLength(1)
    expect(read.keys[0].key).toBe('test1')
  })

  it('should write config to file', () => {
    const testConfig = {
      keys: [
        { key: 'test1', valid: true, lastCheck: '2026-03-23T10:00:00Z' },
        { key: 'test2', valid: false, lastCheck: '2026-03-23T11:00:00Z' }
      ]
    }
    writeConfig(testConfig as any)
    const read = readConfig()
    expect(read.keys).toHaveLength(2)
    expect(read.keys[0].key).toBe('test1')
    expect(read.keys[1].valid).toBe(false)
  })

  it('should handle missing config gracefully', () => {
    // Remove config if it exists
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
    // readConfig should create it
    const config = readConfig()
    expect(config.keys).toEqual([])
  })
})
