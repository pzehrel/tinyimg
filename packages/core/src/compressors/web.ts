import type { Buffer } from 'node:buffer'
import UserAgent from 'user-agents'
import { ClientError, ConnectionError, ServerError } from '../errors'
import { HttpClient } from '../http-client'

function randomIPv4(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.')
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface WebCompressResult {
  buffer: Buffer
  compressor: string
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function webCompress(
  buffer: Buffer,
  client: HttpClient = new HttpClient(),
): Promise<WebCompressResult> {
  let lastError: ServerError | undefined
  let attempt = 0

  while (attempt <= MAX_RETRIES) {
    try {
      const res = await client.request({
        url: 'https://tinypng.com/backend/opt/shrink',
        method: 'POST',
        headers: {
          'User-Agent': new UserAgent().toString(),
          'X-Forwarded-For': randomIPv4(),
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      })

      if (res.status >= 500 && res.status <= 599) {
        throw new ServerError(`WebCompressor failed with status ${res.status}`, res.status)
      }

      if (res.status >= 400 && res.status <= 499) {
        throw new ClientError(`WebCompressor failed with status ${res.status}`, res.status)
      }

      let json: unknown
      try {
        json = JSON.parse(res.data.toString())
      }
      catch {
        throw new ClientError('WebCompressor invalid JSON response', 0)
      }

      const url = (json as { output?: { url?: string } })?.output?.url
      if (!url) {
        throw new ClientError('WebCompressor missing output url', 0)
      }

      const compressed = await client.download(url)
      return { buffer: compressed, compressor: 'WebCompressor' }
    }
    catch (err) {
      if (err instanceof ServerError) {
        lastError = err
        if (attempt < MAX_RETRIES) {
          await sleep(randomDelay(RETRY_DELAY_MS, RETRY_DELAY_MS + 3000))
          attempt++
          continue
        }
        throw err
      }

      if (err instanceof ClientError) {
        throw err
      }

      throw new ConnectionError(
        err instanceof Error ? err.message : 'WebCompressor connection error',
        err instanceof Error ? err : undefined,
      )
    }
  }

  throw lastError ?? new ServerError('WebCompressor failed after retries', 0)
}
