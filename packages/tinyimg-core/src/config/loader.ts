import process from 'node:process'
import { readConfig } from './storage'

export interface LoadedKey {
  key: string
  valid?: boolean
  lastCheck?: string
}

function parseEnvVar(value: string | undefined, isMultiple: boolean): string[] | null {
  if (!value?.trim())
    return null
  if (isMultiple) {
    return value.split(',').map(k => k.trim()).filter(k => k.length > 0)
  }
  return [value.trim()]
}

export function loadKeys(): LoadedKey[] {
  // Priority 1: TINYIMG_KEYS (highest priority)
  const tinyimgKeys = parseEnvVar(process.env.TINYIMG_KEYS, true)
  if (tinyimgKeys)
    return tinyimgKeys.map(key => ({ key }))

  // Priority 2: TINYIMG_KEY
  const tinyimgKey = parseEnvVar(process.env.TINYIMG_KEY, false)
  if (tinyimgKey)
    return tinyimgKey.map(key => ({ key }))

  // Priority 3: TINYPNG_KEYS
  const tinypngKeys = parseEnvVar(process.env.TINYPNG_KEYS, true)
  if (tinypngKeys)
    return tinypngKeys.map(key => ({ key }))

  // Priority 4: TINYPNG_KEY
  const tinypngKey = parseEnvVar(process.env.TINYPNG_KEY, false)
  if (tinypngKey)
    return tinypngKey.map(key => ({ key }))

  // Priority 5: Global config file (lowest priority)
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
