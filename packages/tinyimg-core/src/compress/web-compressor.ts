import type { ICompressor } from './types'
import { Buffer } from 'node:buffer'
import https from 'node:https'
import { logInfo } from '../utils/logger'
import { RetryManager } from './retry'

const TINYPNG_WEB_URL = 'https://tinypng.com/backend/opt/shrink'

export class TinyPngWebCompressor implements ICompressor {
  private retryManager: RetryManager
  private requestHeaders?: Record<string, string>

  constructor(maxRetries: number = 8) {
    this.retryManager = new RetryManager(maxRetries)
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
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:119.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0',
    ]

    const randomIndex = Math.floor(Math.random() * userAgents.length)
    return userAgents[randomIndex]
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
