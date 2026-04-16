import { Buffer } from 'node:buffer'
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HttpClient } from '../src/http-client'

describe('httpClient', () => {
  const client = new HttpClient()
  let server: ReturnType<typeof createServer>
  let port: number

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`)
      const pathname = url.pathname

      if (pathname === '/echo') {
        let body = Buffer.alloc(0)
        req.on('data', (chunk) => {
          body = Buffer.concat([body, chunk])
        })
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json', 'X-Echo': '1' })
          res.end(JSON.stringify({ method: req.method, headers: req.headers, body: body.toString() }))
        })
        return
      }

      if (pathname === '/slow') {
        // never respond
        return
      }

      if (pathname === '/error') {
        res.writeHead(500)
        res.end('server error')
        return
      }

      if (pathname === '/data') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('hello world')
        return
      }

      res.writeHead(404)
      res.end('not found')
    })

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as { port: number }).port
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  it('request() returns correct status, headers, and data for a successful request', async () => {
    const res = await client.request({ url: `http://localhost:${port}/data` })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/plain')
    expect(res.data.toString()).toBe('hello world')
  })

  it('request() sends headers and body correctly', async () => {
    const body = Buffer.from(JSON.stringify({ foo: 'bar' }))
    const res = await client.request({
      url: `http://localhost:${port}/echo`,
      method: 'POST',
      headers: { 'X-Custom': 'value', 'Content-Type': 'application/json' },
      body,
    })
    expect(res.status).toBe(200)
    const json = JSON.parse(res.data.toString())
    expect(json.method).toBe('POST')
    expect(json.headers['x-custom']).toBe('value')
    expect(json.body).toBe(body.toString())
  })

  it('request() throws on timeout', async () => {
    await expect(
      client.request({ url: `http://localhost:${port}/slow`, timeout: 50 }),
    ).rejects.toThrow('Request timeout')
  })

  it('request() throws on network error (connection refused)', async () => {
    await expect(
      client.request({ url: 'http://localhost:1/data' }),
    ).rejects.toThrow()
  })

  it('download() returns buffer on success', async () => {
    const buf = await client.download(`http://localhost:${port}/data`)
    expect(buf.toString()).toBe('hello world')
  })

  it('download() throws when status >= 400', async () => {
    await expect(client.download(`http://localhost:${port}/error`)).rejects.toThrow(
      'Download failed with status 500',
    )
    await expect(client.download(`http://localhost:${port}/not-found`)).rejects.toThrow(
      'Download failed with status 404',
    )
  })
})
