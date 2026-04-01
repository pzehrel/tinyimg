import { Buffer } from 'node:buffer'
import https from 'node:https'
import { maskKey } from '../keys/masker'

const TINYPNG_API_URL = 'https://api.tinify.com/shrink'
const MAX_REDIRECTS = 5

export class TinyPngHttpClient {
  private redirectCount = 0

  /**
   * Compress an image by uploading to TinyPNG API and downloading the result.
   *
   * @param key - TinyPNG API key
   * @param buffer - Image buffer to compress
   * @returns Compressed image buffer
   */
  async compress(key: string, buffer: Buffer): Promise<Buffer> {
    const outputUrl = await this.uploadImage(key, buffer)
    this.redirectCount = 0 // Reset redirect counter
    return this.downloadImage(outputUrl, key)
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
   * @returns URL of compressed image
   */
  private async uploadImage(key: string, buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(key)

      const req = https.request(
        TINYPNG_API_URL,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.byteLength,
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
                if (!response.output?.url) {
                  return reject(new Error('No output URL in response'))
                }
                return resolve(response.output.url)
              }
              catch (error: any) {
                return reject(new Error(`Failed to parse response: ${error.message}`))
              }
            }

            // Error: non-2xx status codes
            const error = this.createError(statusCode, data, key)
            reject(error)
          })
        },
      )

      req.on('error', (error) => {
        // Network errors preserve error.code
        reject(error)
      })

      // Write buffer directly (not using stream.pipe)
      req.write(buffer)
      req.end()
    })
  }

  /**
   * Download compressed image from TinyPNG API.
   * Supports following redirects (up to MAX_REDIRECTS).
   *
   * @param url - URL to download from
   * @param key - TinyPNG API key
   * @returns Downloaded image buffer
   */
  private async downloadImage(url: string, key: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(key)

      const req = https.request(
        url,
        {
          method: 'GET',
          headers: {
            Authorization: authHeader,
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0

          // Handle redirects (3xx)
          if (statusCode >= 300 && statusCode < 400) {
            const redirectUrl = res.headers.location
            if (!redirectUrl) {
              return reject(new Error(`Redirect (${statusCode}) but no Location header`))
            }

            // Check redirect limit
            if (this.redirectCount >= MAX_REDIRECTS) {
              return reject(new Error(`Maximum redirects (${MAX_REDIRECTS}) exceeded`))
            }

            // Follow redirect
            this.redirectCount++
            return resolve(this.downloadImage(redirectUrl, key))
          }

          // Success: 2xx status codes
          if (statusCode >= 200 && statusCode < 300) {
            const chunks: Buffer[] = []

            res.on('data', (chunk) => {
              chunks.push(chunk)
            })

            res.on('end', () => {
              resolve(Buffer.concat(chunks))
            })

            res.on('error', (error) => {
              reject(error)
            })

            return
          }

          // Error: non-2xx/3xx status codes
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            const error = this.createError(statusCode, data, key)
            reject(error)
          })
        },
      )

      req.on('error', (error) => {
        // Network errors preserve error.code
        reject(error)
      })

      req.end()
    })
  }
}
