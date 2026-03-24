import process from 'node:process'
import { readConfig } from './storage'

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
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
    return keys.map((key: string) => ({ key }))
  }

  // Priority 2: Global config file
  try {
    const config = readConfig()
    return config.keys.map(metadata => ({
      key: metadata.key,
      valid: metadata.valid,
      lastCheck: metadata.lastCheck,
    }))
  }
  catch {
    // Config file doesn't exist or is invalid
    return []
  }
}
