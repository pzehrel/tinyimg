import type { KeyMetadata } from './types.js'
import { readConfig } from './storage.js'

export interface LoadedKey {
  key: string
  valid?: boolean
  lastCheck?: string
}

export function loadKeys(): LoadedKey[] {
  // Priority 1: Environment variable (highest priority)
  const envKeys = process.env.TINYPNG_KEYS
  if (envKeys && envKeys.trim()) {
    const keys = envKeys.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
    return keys.map(key => ({ key }))
  }

  // Priority 2: Global config file
  try {
    const config = readConfig()
    return config.keys.map(metadata => ({
      key: metadata.key,
      valid: metadata.valid,
      lastCheck: metadata.lastCheck
    }))
  } catch {
    // Config file doesn't exist or is invalid
    return []
  }
}
