import { Buffer } from 'node:buffer'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Buffer
  timeout?: number
}

export interface Response {
  status: number
  headers: Record<string, string | string[]>
  data: Buffer
}

export class HttpClient {
  async request(options: RequestOptions): Promise<Response> {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = options
    const parsed = new URL(url)

    return new Promise((resolve, reject) => {
      let settled = false
      const controller = new AbortController()
      const timer = setTimeout(() => {
        settled = true
        controller.abort()
        reject(new Error('Request timeout'))
      }, timeout)

      const requestModule = parsed.protocol === 'https:' ? https : http
      const req = requestModule.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method,
          headers,
          signal: controller.signal,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            clearTimeout(timer)
            if (!settled) {
              settled = true
              resolve({
                status: res.statusCode || 0,
                headers: res.headers as Record<string, string | string[]>,
                data: Buffer.concat(chunks),
              })
            }
          })
        },
      )

      req.on('error', (err) => {
        clearTimeout(timer)
        if (!settled) {
          settled = true
          reject(err)
        }
      })

      if (body) {
        req.write(body)
      }
      req.end()
    })
  }

  async download(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<Buffer> {
    const res = await this.request({ url, method: 'GET', ...options })
    if (res.status >= 400) {
      throw new Error(`Download failed with status ${res.status}`)
    }
    return res.data
  }
}
