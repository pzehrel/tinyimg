import process from 'node:process'
import { select } from '@clack/prompts'
import { maskKey, queryQuota, readConfig, validateKey, writeConfig } from '@pz4l/tinyimg-core'
import { logger } from '../utils/logger'

export async function keyAdd(key: string): Promise<void> {
  try {
    // Validate key using tinify API
    const isValid = await validateKey(key)

    if (!isValid) {
      logger.error('Invalid API key. Please check your key and try again.')
      process.exit(1)
    }

    // Read config, add key, write back
    const config = readConfig()

    // Check if key already exists
    const existingKey = config.keys.find(k => k.key === key)
    if (existingKey) {
      logger.warn(`API key ${maskKey(key)} already exists in config.`)
      process.exit(0)
    }

    // Add new key with metadata
    config.keys.push({
      key,
      valid: true,
      lastCheck: new Date().toISOString(),
    })

    writeConfig(config)

    logger.success(`API key ${maskKey(key)} added successfully.`)
  }
  catch (error: any) {
    if (error.message?.includes('credentials') || error.message?.includes('Unauthorized')) {
      logger.error('Invalid API key. Please check your key and try again.')
      process.exit(1)
    }

    // Network or other errors
    logger.error(`Error validating key: ${error.message}`)
    process.exit(1)
  }
}

export async function keyRemove(key?: string): Promise<void> {
  try {
    const config = readConfig()

    if (config.keys.length === 0) {
      logger.warn('No API keys configured. Use "tinyimg key add <key>" to add one.')
      process.exit(0)
    }

    let keyToRemove: string

    // If no key provided, use interactive selection
    if (!key) {
      const options = config.keys.map(k => ({
        value: k.key,
        label: `${maskKey(k.key)} ${k.valid ? '(valid)' : '(invalid)'}`,
      }))

      const selected = await select({
        message: 'Select API key to remove:',
        options,
      })

      if (typeof selected !== 'string') {
        logger.warn('Operation cancelled.')
        process.exit(0)
      }

      keyToRemove = selected
    }
    else {
      keyToRemove = key
    }

    // Find and remove the key
    const keyIndex = config.keys.findIndex(k => k.key === keyToRemove)

    if (keyIndex === -1) {
      logger.error(`API key ${maskKey(keyToRemove)} not found.`)
      process.exit(1)
    }

    const removedKey = config.keys.splice(keyIndex, 1)[0]
    writeConfig(config)

    logger.success(`API key ${maskKey(removedKey.key)} removed successfully.`)
  }
  catch (error: any) {
    logger.error(`Error removing key: ${error.message}`)
    process.exit(1)
  }
}

export async function keyList(): Promise<void> {
  try {
    const config = readConfig()

    if (config.keys.length === 0) {
      logger.warn('No API keys configured.')
      logger.info('Use "tinyimg key add <key>" to add one.')
      process.exit(0)
    }

    logger.info('API Keys:')

    const quotas: PromiseSettledResult<number>[] = []

    for (const keyMeta of config.keys) {
      const masked = maskKey(keyMeta.key)
      const lastCheck = new Date(keyMeta.lastCheck).toLocaleString()

      if (keyMeta.valid) {
        logger.success(`${masked} - Valid`)
      }
      else {
        logger.error(`${masked} - Invalid`)
      }

      try {
        const remaining = await queryQuota(keyMeta.key)
        quotas.push({ status: 'fulfilled', value: remaining })
        logger.info(`  Quota: ${remaining}/500 remaining | Last check: ${lastCheck}`)
      }
      catch {
        quotas.push({ status: 'rejected', reason: new Error('Unable to query') })
        logger.warn(`  Quota: Unable to query | Last check: ${lastCheck}`)
      }
    }

    // 显示总计行
    const validCount = config.keys.filter(k => k.valid).length
    const totalQuota = quotas
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value, 0)
    logger.info(`Total: ${config.keys.length} keys, ${validCount} valid, ${totalQuota}/${config.keys.length * 500} quota remaining`)
  }
  catch (error: any) {
    logger.error(`Error listing keys: ${error.message}`)
    process.exit(1)
  }
}
