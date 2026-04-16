import { Buffer } from 'node:buffer'
import { AccountError, ClientError, ConnectionError, ServerError } from '../errors'
import { HttpClient } from '../http-client'

export interface ApiCompressResult {
  buffer: Buffer
  compressor: string
  compressionCount?: number
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

/**
 * Compress an image buffer using the TinyPNG API.
 *
 * @param buffer - The input image buffer.
 * @param apiKey - The TinyPNG API key.
 * @param client - Optional {@link HttpClient} instance. Defaults to a new `HttpClient()`.
 * @returns The compressed buffer and compressor name.
 * @throws {AccountError} When the API responds with status 401 or 429. The caller/upstream orchestrator is responsible for key switching on 429.
 * @throws {ClientError} When the API responds with a 4xx status other than 401/429.
 * @throws {ServerError} When the API responds with a 5xx status.
 * @throws {ConnectionError} When a network or timeout error occurs.
 *
 * @remarks
 * - 5xx errors trigger up to 2 retries with a fixed 1-second delay.
 * - 401/4xx errors fail fast (no retries).
 * - 429 is surfaced as an {@link AccountError}; this function does NOT internally switch keys — key switching is the caller's responsibility.
 */
export async function apiCompress(
  buffer: Buffer,
  apiKey: string,
  client: HttpClient = new HttpClient(),
): Promise<ApiCompressResult> {
  const auth = Buffer.from(`api:${apiKey}`).toString('base64')

  let lastError: ServerError | undefined
  let attempt = 0

  while (attempt <= MAX_RETRIES) {
    try {
      const res = await client.request({
        url: 'https://api.tinify.com/shrink',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      })

      const errorDetail = extractErrorMessage(res.data)
      if (res.status >= 500 && res.status <= 599) {
        throw new ServerError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'ApiCompressor')
      }

      if (res.status === 401 || res.status === 429) {
        throw new AccountError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'ApiCompressor')
      }

      if (res.status >= 400 && res.status <= 499) {
        throw new ClientError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'ApiCompressor')
      }

      if (res.status !== 201) {
        // Unexpected status code (only 201 is considered success); treat as client error (fail fast).
        throw new ClientError(`failed with status ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`, res.status, 'ApiCompressor')
      }

      const location = Array.isArray(res.headers.location)
        ? res.headers.location[0]
        : res.headers.location
      if (!location) {
        throw new ClientError('missing Location header', 0, 'ApiCompressor')
      }

      const compressed = await client.download(location)
      const countHeader = res.headers['compression-count']
      const compressionCount = countHeader ? Number.parseInt(String(countHeader), 10) : undefined
      return { buffer: compressed, compressor: 'ApiCompressor', compressionCount }
    }
    catch (err) {
      if (err instanceof ServerError) {
        lastError = err
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS)
          attempt++
          continue
        }
        throw err
      }

      if (err instanceof AccountError || err instanceof ClientError) {
        throw err
      }

      // Network/timeout or other unexpected errors
      throw new ConnectionError(
        err instanceof Error ? err.message : 'connection error',
        err instanceof Error ? err : undefined,
        'ApiCompressor',
      )
    }
  }

  throw lastError ?? new ServerError('ApiCompressor failed after retries', 0)
}

function delay(ms: number): Promise<void> {
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
