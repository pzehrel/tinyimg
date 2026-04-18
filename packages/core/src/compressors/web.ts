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

function extractErrorMessage(data: Buffer): string | undefined {
  try {
    const json = JSON.parse(data.toString()) as { error?: string, message?: string }
    return json.message || json.error
  }
  catch {
    return undefined
  }
}

export interface WebCompressResult {
  buffer: Buffer
  compressor: string
}

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 1000
const MAX_BACKOFF_MS = 7000

let concurrencyLimit = Infinity
let activeCount = 0
const waitQueue: Array<() => void> = []

function acquire(): Promise<() => void> {
  return new Promise((resolve) => {
    if (activeCount < concurrencyLimit) {
      activeCount++
      resolve(() => {
        activeCount--
        const next = waitQueue.shift()
        if (next)
          next()
      })
    }
    else {
      waitQueue.push(() => {
        activeCount++
        resolve(() => {
          activeCount--
          const next = waitQueue.shift()
          if (next)
            next()
        })
      })
    }
  })
}

export async function webCompress(
  buffer: Buffer,
  client: HttpClient = new HttpClient(),
  retryDelayMs: number = RETRY_DELAY_MS,
): Promise<WebCompressResult> {
  const release = await acquire()
  try {
    let lastError: ServerError | ClientError | undefined
    let attempt = 0

    while (attempt <= MAX_RETRIES) {
      try {
        const userAgent = new UserAgent().toString()
        const forwardedFor = randomIPv4()
        const headers = {
          'User-Agent': userAgent,
          'X-Forwarded-For': forwardedFor,
          'Content-Type': 'application/octet-stream',
        }

        const res = await client.request({
          url: 'https://tinypng.com/backend/opt/shrink',
          method: 'POST',
          headers,
          body: buffer,
        })

        const errorDetail = extractErrorMessage(res.data)
        if (res.status >= 500 && res.status <= 599) {
          throw new ServerError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'WebCompressor')
        }

        if (res.status === 429) {
          throw new ClientError(`rate limited: ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'WebCompressor')
        }

        if (res.status >= 400 && res.status <= 499) {
          throw new ClientError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'WebCompressor')
        }

        let json: unknown
        try {
          json = JSON.parse(res.data.toString())
        }
        catch {
          throw new ClientError('invalid JSON response', 0, 'WebCompressor')
        }

        const url = (json as { output?: { url?: string } })?.output?.url
        if (!url) {
          throw new ClientError('missing output url', 0, 'WebCompressor')
        }

        const compressed = await client.download(url, { headers })
        return { buffer: compressed, compressor: 'WebCompressor' }
      }
      catch (err) {
        const isRateLimit = err instanceof ClientError && err.status === 429
        if (isRateLimit && concurrencyLimit === Infinity) {
          concurrencyLimit = 2
        }

        if (err instanceof ServerError || isRateLimit) {
          lastError = err
          if (attempt < MAX_RETRIES) {
            const baseDelay = Math.min(retryDelayMs * (2 ** attempt), MAX_BACKOFF_MS)
            await sleep(randomDelay(baseDelay, baseDelay + 3000))
            attempt++
            continue
          }
          throw err
        }

        if (err instanceof ClientError) {
          throw err
        }

        throw new ConnectionError(
          err instanceof Error ? err.message : 'connection error',
          err instanceof Error ? err : undefined,
          'WebCompressor',
        )
      }
    }

    throw lastError ?? new ServerError('failed after retries', 0, 'WebCompressor')
  }
  finally {
    release()
  }
}
