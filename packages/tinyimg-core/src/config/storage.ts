import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { ConfigFile } from './types.js'

const CONFIG_DIR = '.tinyimg'
const CONFIG_FILE = 'keys.json'

export function getConfigPath(): string {
  const homeDir = os.homedir()
  return path.join(homeDir, CONFIG_DIR, CONFIG_FILE)
}

export function ensureConfigFile(): void {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 })
  }

  if (!fs.existsSync(configPath)) {
    const initialContent: ConfigFile = { keys: [] }
    fs.writeFileSync(
      configPath,
      JSON.stringify(initialContent, null, 2),
      { mode: 0o600 }
    )
  }
}

export function readConfig(): ConfigFile {
  ensureConfigFile()
  const configPath = getConfigPath()
  const content = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(content) as ConfigFile
}

export function writeConfig(config: ConfigFile): void {
  ensureConfigFile()
  const configPath = getConfigPath()
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2),
    { mode: 0o600 }
  )
}
