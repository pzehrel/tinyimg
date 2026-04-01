import { Buffer } from 'node:buffer'
import https from 'node:https'
import { maskKey } from '../keys/masker'
import { httpRequest } from '../utils/http-request'

const TINYPNG_API_URL = 'https://api.tinify.com/shrink'
const MAX_REDIRECTS = 5

export interface CompressResult {
  buffer: Buffer
  compressionCount: number
}

export class TinyPngHttpClient {
  /**
   * Compress an image by uploading to TinyPNG API and downloading the result.
   *
   * @param key - TinyPNG API key
   * @param buffer - Image buffer to compress
   * @returns Compressed image buffer and compression count
   */
  async compress(key: string, buffer: Buffer): Promise<CompressResult> {
    const { url, compressionCount } = await this.uploadImage(key, buffer)
    return this.downloadImage(url, key, compressionCount)
  }

  /**
   * Validate if an API key is valid.
   *
   * @param key - TinyPNG API key to validate
   * @returns true if key is valid, false otherwise
   */
  async validateKey(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(key)

      const req = https.request(
        TINYPNG_API_URL,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/octet-stream',
          },
        },
        (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            const statusCode = res.statusCode || 0

            // Success: 2xx status codes
            if (statusCode >= 200 && statusCode < 300) {
              return resolve(true)
            }

            // Auth failed: 401/403 return false
            if (statusCode === 401 || statusCode === 403) {
              return resolve(false)
            }

            // Other 4xx errors return false
            if (statusCode >= 400 && statusCode < 500) {
              return resolve(false)
            }

            // 5xx errors should be retried
            const error = this.createError(statusCode, data, key)
            reject(error)
          })
        },
      )

      req.on('error', (error) => {
        // Network errors preserve error.code
        reject(error)
      })

      // Send empty buffer to trigger auth check
      req.write(Buffer.alloc(0))
      req.end()
    })
  }

  /**
   * Get the number of compressions used this month for a given API key.
   *
   * @param key - TinyPNG API key
   * @returns Number of compressions used this month
   */
  async getCompressionCount(key: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(key)

      const req = https.request(
        TINYPNG_API_URL,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/octet-stream',
          },
        },
        (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            const statusCode = res.statusCode || 0

            // Success: 2xx status codes
            if (statusCode >= 200 && statusCode < 300) {
              try {
                const response = JSON.parse(data)
                const count = response.compressionCount || 0
                return resolve(count)
              }
              catch {
                // If JSON parse fails, return 0
                return resolve(0)
              }
            }

            // Auth failed: 401/403 return 0
            if (statusCode === 401 || statusCode === 403) {
              return resolve(0)
            }

            // Other 4xx errors return 0
            if (statusCode >= 400 && statusCode < 500) {
              return resolve(0)
            }

            // 5xx errors should be retried
            const error = this.createError(statusCode, data, key)
            reject(error)
          })
        },
      )

      req.on('error', (error) => {
        // Network errors preserve error.code
        reject(error)
      })

      // Send empty buffer to trigger request
      req.write(Buffer.alloc(0))
      req.end()
    })
  }

  /**
   * Create Basic Auth header for TinyPNG API.
   *
   * @param key - TinyPNG API key
   * @returns Basic Auth header string
   */
  private createAuthHeader(key: string): string {
    const auth = Buffer.from(`api:${key}`).toString('base64')
    return `Basic ${auth}`
  }

  /**
   * Create a structured error object with status code and error code.
   *
   * @param statusCode - HTTP status code
   * @param responseBody - Response body string
   * @param key - API key (for masking in error message)
   * @returns Error object with statusCode and errorCode properties
   */
  private createError(statusCode: number, responseBody: string, key: string): Error {
    const maskedKey = maskKey(key)
    const truncatedBody = responseBody.length > 200
      ? `${responseBody.substring(0, 200)}... (truncated)`
      : responseBody

    // Auth failed: 401/403
    if (statusCode === 401 || statusCode === 403) {
      const error = new Error(
        `API key ${maskedKey} 认证失败（${statusCode}）: ${truncatedBody}`,
      )
      ;(error as any).statusCode = statusCode
      ;(error as any).errorCode = 'AUTH_FAILED'
      return error
    }

    // Rate limited: 429
    if (statusCode === 429) {
      const error = new Error(
        `API 速率限制已超出（429 Too Many Requests）`,
      )
      ;(error as any).statusCode = statusCode
      ;(error as any).errorCode = 'RATE_LIMITED'
      return error
    }

    // Server error: 5xx
    if (statusCode >= 500 && statusCode < 600) {
      const error = new Error(
        `TinyPNG 服务器错误（${statusCode}）: ${truncatedBody}`,
      )
      ;(error as any).statusCode = statusCode
      ;(error as any).errorCode = 'SERVER_ERROR'
      return error
    }

    // Other client errors: 4xx
    if (statusCode >= 400 && statusCode < 500) {
      const error = new Error(
        `HTTP ${statusCode}: ${truncatedBody}`,
      )
      ;(error as any).statusCode = statusCode
      ;(error as any).errorCode = 'CLIENT_ERROR'
      return error
    }

    // Unknown error
    const error = new Error(
      `Unknown error (${statusCode}): ${truncatedBody}`,
    )
    ;(error as any).statusCode = statusCode
    ;(error as any).errorCode = 'UNKNOWN'
    return error
  }

  /**
   * Upload image to TinyPNG API and get the compressed image URL.
   *
   * @param key - TinyPNG API key
   * @param buffer - Image buffer to upload
   * @returns URL of compressed image and compression count
   */
  private async uploadImage(key: string, buffer: Buffer): Promise<{ url: string, compressionCount: number }> {
    const response = await httpRequest<{ output: { url: string }, compressionCount?: number }>(
      TINYPNG_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': this.createAuthHeader(key),
          'Content-Type': 'application/octet-stream',
          'Content-Length': buffer.byteLength,
        },
        body: buffer,
      },
    )

    if (!response.data.output?.url) {
      throw new Error('No output URL in response')
    }

    // Handle undefined compressionCount (TinyPNG API may not return this field)
    const compressionCount = response.data.compressionCount ?? 0

    return {
      url: response.data.output.url,
      compressionCount,
    }
  }

  /**
   * Download compressed image from TinyPNG API.
   * Supports following redirects (handled by httpRequest utility).
   *
   * @param url - URL to download from
   * @param key - TinyPNG API key
   * @param compressionCount - Compression count from upload response
   * @returns Compressed image buffer and compression count
   */
  private async downloadImage(url: string, key: string, compressionCount: number): Promise<CompressResult> {
    const response = await httpRequest<Buffer>(
      url,
      {
        method: 'GET',
        headers: {
          'Authorization': this.createAuthHeader(key),
        },
      },
    )

    return {
      buffer: response.data,
      compressionCount,
    }
  }
}
