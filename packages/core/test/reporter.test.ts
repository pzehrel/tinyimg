import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { createReporter } from '../src/reporter'

function createMockReporter() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function createMockT() {
  return (key: string, params?: Record<string, string | number>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`
    }
    return key
  }
}

describe('createReporter', () => {
  it('logItem outputs success with ratio and sizes', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logItem('logo.png', {
      buffer: Buffer.from(''),
      originalSize: 1000,
      compressedSize: 700,
      ratio: 0.7,
      compressor: 'WebCompressor',
      cached: false,
    })

    expect(reporter.info).toHaveBeenCalledTimes(1)
    const msg = reporter.info.mock.calls[0][0]
    expect(msg).toContain('status.success')
    expect(msg).toContain('logo.png')
    expect(msg).toContain('1000B')
    expect(msg).toContain('700B')
    expect(msg).toContain('-30%')
  })

  it('logItem appends cached tag when cached', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logItem('banner.jpg', {
      buffer: Buffer.from(''),
      originalSize: 1000,
      compressedSize: 1000,
      ratio: 1,
      compressor: 'Cache',
      cached: true,
    })

    expect(reporter.info.mock.calls[0][0]).toContain('cli.output.usedCache')
  })

  it('logItem appends converted tag when convertedPngToJpg', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logItem('logo.png', {
      buffer: Buffer.from(''),
      originalSize: 1000,
      compressedSize: 500,
      ratio: 0.5,
      compressor: 'WebCompressor',
      cached: false,
      convertedPngToJpg: true,
    })

    expect(reporter.info.mock.calls[0][0]).toContain('plugin.output.converted')
  })

  it('logError outputs failed with error message and compressor', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logError('photo.jpg', {
      buffer: Buffer.from(''),
      originalSize: 1000,
      compressedSize: 1000,
      ratio: 1,
      compressor: 'ApiCompressor',
      cached: false,
      error: new Error('rate limited'),
    })

    expect(reporter.error).toHaveBeenCalledTimes(1)
    const msg = reporter.error.mock.calls[0][0]
    expect(msg).toContain('status.failed')
    expect(msg).toContain('rate limited')
    expect(msg).toContain('ApiCompressor')
  })

  it('logError uses compressor from error object if present', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    const err = new Error('bad request') as any
    err.compressor = 'WebCompressor'

    r.logError('photo.jpg', {
      buffer: Buffer.from(''),
      originalSize: 1000,
      compressedSize: 1000,
      ratio: 1,
      compressor: 'ApiCompressor',
      cached: false,
      error: err,
    })

    expect(reporter.error.mock.calls[0][0]).toContain('WebCompressor')
  })

  it('logSummary outputs total, success, cached, failed, saved', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logSummary({
      total: 10,
      success: 7,
      cached: 2,
      failed: 1,
      saved: 1024,
    })

    expect(reporter.info).toHaveBeenCalledTimes(1)
    const msg = reporter.info.mock.calls[0][0]
    expect(msg).toContain('cli.output.compressionComplete')
    expect(msg).toContain('total: 10')
    expect(msg).toContain('success: 7')
    expect(msg).toContain('cached: 2')
    expect(msg).toContain('summary.failed: 1')
    expect(msg).toContain('saved: 1.0KB')
  })

  it('logSummary appends compressionCount when provided', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logSummary({
      total: 5,
      success: 5,
      cached: 0,
      failed: 0,
      saved: 0,
      compressionCount: 42,
    })

    expect(reporter.info.mock.calls[0][0]).toContain('usedThisMonth: 42')
  })

  it('logConvertiblePngs outputs warning tags', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logConvertiblePngs(3)

    expect(reporter.warn).toHaveBeenCalledTimes(2)
    expect(reporter.warn.mock.calls[0][0]).toContain('cli.output.convertiblePngsHint')
    expect(reporter.warn.mock.calls[1][0]).toContain('cli.output.convertiblePngsCommand')
  })

  it('logNoKeysHint outputs warning tag', () => {
    const reporter = createMockReporter()
    const r = createReporter({ t: createMockT(), reporter })

    r.logNoKeysHint()

    expect(reporter.warn).toHaveBeenCalledTimes(1)
    expect(reporter.warn.mock.calls[0][0]).toContain('cli.output.noKeysHint')
  })
})
