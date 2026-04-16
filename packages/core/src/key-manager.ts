import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { HttpClient } from './http-client'
import { maskKey } from './utils/mask'

export interface KeyInfo {
  key: string
  used: number
  remaining: number
}

export interface VerifyResult {
  key: string
  valid: boolean
  used?: number
  remaining?: number
  error?: string
}

interface KeyManagerState {
  projectKeys: string[]
  useUserKeys: boolean
}

let state: KeyManagerState | null = null

export function initKeyManager(options: { projectKeys?: string[], useUserKeys?: boolean }): void {
  state = {
    projectKeys: options.projectKeys?.filter(Boolean) || [],
    useUserKeys: options.useUserKeys ?? false,
  }
}

export function getKey(): string | null {
  if (!state)
    return null
  if (state.projectKeys.length > 0) {
    return state.projectKeys[Math.floor(Math.random() * state.projectKeys.length)]
  }
  return null
}

function getUserKeysPath(): string {
  return path.join(os.homedir(), '.tinyimg', 'keys.json')
}

async function readUserKeys(): Promise<string[]> {
  try {
    const data = await fs.readFile(getUserKeysPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

async function writeUserKeys(keys: string[]): Promise<void> {
  const dir = path.dirname(getUserKeysPath())
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(getUserKeysPath(), JSON.stringify(keys, null, 2))
}

export async function listUserKeys(): Promise<KeyInfo[]> {
  const keys = await readUserKeys()
  return keys.map(k => ({ key: maskKey(k), used: 0, remaining: 500 }))
}

export async function addUserKeys(keys: string[]): Promise<VerifyResult[]> {
  const existing = await readUserKeys()
  const results: VerifyResult[] = []

  for (const key of keys) {
    if (existing.includes(key)) {
      results.push({ key: maskKey(key), valid: true })
      continue
    }

    try {
      const client = new HttpClient()
      const auth = Buffer.from(`api:${key}`).toString('base64')
      const res = await client.request({
        url: 'https://api.tinify.com/shrink',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.alloc(0),
        timeout: 10000,
      })

      if (res.status === 200 || res.status === 400) {
        if (!existing.includes(key)) {
          existing.push(key)
        }
        const countHeader = res.headers['compression-count']
        const used = countHeader ? Number.parseInt(String(countHeader), 10) : 0
        results.push({ key: maskKey(key), valid: true, used, remaining: Math.max(0, 500 - used) })
      }
      else if (res.status === 401) {
        results.push({ key: maskKey(key), valid: false, error: 'Invalid key' })
      }
      else if (res.status === 429) {
        if (!existing.includes(key)) {
          existing.push(key)
        }
        results.push({ key: maskKey(key), valid: true, used: 500, remaining: 0, error: 'Rate limited' })
      }
      else {
        results.push({ key: maskKey(key), valid: false, error: `Unexpected status ${res.status}` })
      }
    }
    catch (err: any) {
      results.push({ key: maskKey(key), valid: false, error: err.message })
    }
  }

  await writeUserKeys(existing)
  return results
}

export async function removeUserKey(maskedKey: string): Promise<void> {
  const keys = await readUserKeys()
  const filtered = keys.filter(k => maskKey(k) !== maskedKey)
  await writeUserKeys(filtered)
}

export async function getUserKey(): Promise<string | null> {
  const keys = await readUserKeys()
  if (keys.length === 0)
    return null
  return keys[Math.floor(Math.random() * keys.length)]
}
