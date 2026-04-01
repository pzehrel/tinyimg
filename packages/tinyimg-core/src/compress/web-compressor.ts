import type { ICompressor } from './types'
import { Buffer } from 'node:buffer'
import https from 'node:https'
import UserAgent from 'user-agents'
import { logInfo } from '../utils/logger'
import { RetryManager } from './retry'

const TINYPNG_WEB_URL = 'https://tinypng.com/backend/opt/shrink'

export class TinyPngWebCompressor implements ICompressor {
  private retryManager: RetryManager
  private requestHeaders?: Record<string, string>
  private userAgentGenerator: UserAgent

  constructor(maxRetries: number = 8) {
    this.retryManager = new RetryManager(maxRetries)
    // Initialize user-agents with desktop filter (UA-03)
    this.userAgentGenerator = new UserAgent({ deviceCategory: 'desktop' })
  }

  async compress(buffer: Buffer): Promise<Buffer> {
    return this.retryManager.execute(async () => {
      // Step 1: Upload image to get compressed URL
      const uploadUrl = await this.uploadToTinyPngWeb(buffer)

      // Step 2: Download compressed image
      const compressedBuffer = await this.downloadCompressedImage(uploadUrl)

      const originalSize = buffer.byteLength
      const compressedSize = compressedBuffer.byteLength
      const saved = ((1 - compressedSize / originalSize) * 100).toFixed(1)

      logInfo(`Compressed with [TinyPngWebCompressor]: ${originalSize} → ${compressedSize} (saved ${saved}%)`)

      return compressedBuffer
    })
  }

  private getRandomHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'X-Forwarded-For': this.getRandomIPv4(),
    }
  }

  private getRandomUserAgent(): string {
    // Generate new random user agent for each request (UA-02)
    const userAgent = this.userAgentGenerator.random()
    return userAgent.toString()
  }

  private getRandomIPv4(): string {
    const octet = () => Math.floor(Math.random() * 256)
    return `${octet()}.${octet()}.${octet()}.${octet()}`
  }

  private async uploadToTinyPngWeb(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      // Generate random headers for this request
      this.requestHeaders = this.getRandomHeaders()

      const req = https.request(
        TINYPNG_WEB_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.byteLength,
            ...this.requestHeaders,
          },
        },
        (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            if (res.statusCode !== 200) {
              const error = new Error(`HTTP ${res.statusCode}: ${data}`)
              ;(error as any).statusCode = res.statusCode
              return reject(error)
            }

            try {
              // Response contains JSON with output URL
              const response = JSON.parse(data)
              if (!response.output?.url) {
                return reject(new Error('No output URL in response'))
              }
              resolve(response.output.url)
            }
            catch (error: any) {
              reject(new Error(`Failed to parse response: ${error.message}`))
            }
          })
        },
      )

      req.on('error', (error) => {
        reject(error)
      })

      // Write raw buffer directly (not multipart)
      req.write(buffer)
      req.end()
    })
  }

  private async downloadCompressedImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Use https.request instead of https.get to include custom headers
      const req = https.request(
        url,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            ...this.requestHeaders,
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            const error = new Error(`HTTP ${res.statusCode} downloading compressed image`)
            ;(error as any).statusCode = res.statusCode
            return reject(error)
          }

          const chunks: Buffer[] = []
          res.on('data', chunk => chunks.push(chunk))
          res.on('end', () => resolve(Buffer.concat(chunks)))
          res.on('error', reject)
        },
      )

      req.on('error', reject)
      req.end()
    })
  }

  getFailureCount(): number {
    return this.retryManager.getFailureCount()
  }
}
