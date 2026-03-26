import process from 'node:process'
import { select } from '@clack/prompts'
import { maskKey, queryQuota, readConfig, validateKey, writeConfig } from '@pz4l/tinyimg-core'
import kleur from 'kleur'

export async function keyAdd(key: string): Promise<void> {
  try {
    // Validate key using tinify API
    const isValid = await validateKey(key)

    if (!isValid) {
      console.error(kleur.red('✗ Invalid API key. Please check your key and try again.'))
      process.exit(1)
    }

    // Read config, add key, write back
    const config = readConfig()

    // Check if key already exists
    const existingKey = config.keys.find(k => k.key === key)
    if (existingKey) {
      console.warn(kleur.yellow(`⚠ API key ${maskKey(key)} already exists in config.`))
      process.exit(0)
    }

    // Add new key with metadata
    config.keys.push({
      key,
      valid: true,
      lastCheck: new Date().toISOString(),
    })

    writeConfig(config)

    console.log(kleur.green(`✓ API key ${maskKey(key)} added successfully.`))
  }
  catch (error: any) {
    if (error.message?.includes('credentials') || error.message?.includes('Unauthorized')) {
      console.error(kleur.red('✗ Invalid API key. Please check your key and try again.'))
      process.exit(1)
    }

    // Network or other errors
    console.error(kleur.red(`✗ Error validating key: ${error.message}`))
    process.exit(1)
  }
}

export async function keyRemove(key?: string): Promise<void> {
  try {
    const config = readConfig()

    if (config.keys.length === 0) {
      console.warn(kleur.yellow('⚠ No API keys configured. Use "tinyimg key add <key>" to add one.'))
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
        console.log(kleur.yellow('Operation cancelled.'))
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
      console.error(kleur.red(`✗ API key ${maskKey(keyToRemove)} not found.`))
      process.exit(1)
    }

    const removedKey = config.keys.splice(keyIndex, 1)[0]
    writeConfig(config)

    console.log(kleur.green(`✓ API key ${maskKey(removedKey.key)} removed successfully.`))
  }
  catch (error: any) {
    console.error(kleur.red(`✗ Error removing key: ${error.message}`))
    process.exit(1)
  }
}

export async function keyList(): Promise<void> {
  try {
    const config = readConfig()

    if (config.keys.length === 0) {
      console.log(kleur.yellow('⚠ No API keys configured.'))
      console.log(kleur.gray('Use "tinyimg key add <key>" to add one.'))
      process.exit(0)
    }

    console.log(kleur.bold('\nAPI Keys:\n'))

    for (const keyMeta of config.keys) {
      const masked = maskKey(keyMeta.key)
      const status = keyMeta.valid ? kleur.green('✓ Valid') : kleur.red('✗ Invalid')
      const lastCheck = new Date(keyMeta.lastCheck).toLocaleString()

      console.log(`  ${masked} - ${status}`)

      try {
        const remaining = await queryQuota(keyMeta.key)
        const quotaInfo = kleur.gray(`  Quota: ${remaining}/500 remaining | Last check: ${lastCheck}`)
        console.log(quotaInfo)
      }
      catch {
        const quotaInfo = kleur.yellow(`  Quota: Unable to query | Last check: ${lastCheck}`)
        console.log(quotaInfo)
      }

      console.log() // Empty line between keys
    }
  }
  catch (error: any) {
    console.error(kleur.red(`✗ Error listing keys: ${error.message}`))
    process.exit(1)
  }
}
