import type { CompressFileResult } from '../src/compress-file'
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { createLocaleI18n } from '../../locale/src/index'
import { createReporter } from '../src/reporter'

function result(overrides: Partial<CompressFileResult> = {}): CompressFileResult {
  return { buffer: Buffer.alloc(700), originalSize: 1000, compressedSize: 700, ratio: 0.7, compressor: 'ApiCompressor', cached: false, outputExt: 'png', ...overrides }
}
function setup(options: { verbose?: boolean, target?: 'cli' | 'plugin', locale?: 'en' | 'zh-CN' } = {}) {
  const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return { sink, log: createReporter({ t: createLocaleI18n(options.locale || 'en'), reporter: sink, ...options }) }
}

describe('compression logs', () => {
  it('defaults to start and concise summary instead of per-image output', () => {
    const { log, sink } = setup({ target: 'plugin' })
    log.logStart(1)
    log.track(result())
    log.logItem('logo.png', result())
    expect(sink.info).toHaveBeenCalledTimes(1)
    log.logSummary()
    expect(sink.info).toHaveBeenCalledTimes(2)
    const text = sink.info.mock.calls[1][0]
    expect(text).toBe('1 image · 1 compressed · 1000 B → 700 B (−30.0%)')
    expect(text).not.toContain('0 cached')
    expect(text).not.toContain('ApiCompressor')
  })
  it('buffers verbose details in filename order and flushes them once', () => {
    const { log, sink } = setup({ verbose: true })
    for (const name of ['z.png', 'a.png']) {
      log.track(result())
      log.logItem(name, result())
    }
    expect(sink.info).not.toHaveBeenCalled()
    log.logSummary()
    expect(sink.info.mock.calls[0][0]).toContain('a.png')
    expect(sink.info.mock.calls[1][0]).toContain('z.png')
    expect(sink.info.mock.calls[0][0]).toContain('−30.0%')
    const count = sink.info.mock.calls.length
    log.logSummary()
    expect(sink.info.mock.calls.length).toBe(count + 1)
  })
  it('counts savings from cached results and shows cache status in details', () => {
    const { log, sink } = setup({ verbose: true })
    const cached = result({ cached: true })
    log.track(cached)
    log.logItem('cached.png', cached)
    log.logSummary()
    expect(log.getSummary().saved).toBe(300)
    expect(sink.info.mock.calls[0][0]).toContain('cached')
    expect(sink.info.mock.calls[1][0]).toContain('1 cached')
    expect(sink.info.mock.calls[1][0]).not.toContain('0 compressed')
  })
  it('shows already-processed and converted output without a misleading zero reduction', () => {
    const { log, sink } = setup({ verbose: true })
    const processed = result({ alreadyProcessed: true, originalSize: 700 })
    log.track(processed)
    log.logItem('done.png', processed)
    log.logSummary()
    expect(sink.info.mock.calls[0][0]).toContain('already compressed')
    expect(sink.info.mock.calls[0][0]).not.toContain('0.0%')
    const converted = result({ convertedPngToJpg: true, outputExt: 'jpg' })
    log.logItem('converted.jpg', converted)
    log.logSummary()
    expect(sink.info.mock.calls.at(-2)?.[0]).toContain('PNG → JPG')
  })
  it('formats growth with a positive sign and avoids NaN/Infinity', () => {
    const { log, sink } = setup({ verbose: true })
    log.track(result())
    log.logItem('small.png', result({ originalSize: 100, compressedSize: 120 }))
    log.logItem('empty.png', result({ originalSize: 0, compressedSize: 0 }))
    log.logSummary()
    const text = sink.info.mock.calls.flat().join('\n')
    expect(text).toContain('+20.0%')
    expect(text).not.toMatch(/--|NaN|Infinity/)
  })
  it('reports failures and cache warnings through their proper log levels', () => {
    const { log, sink } = setup()
    const failure = result({ error: new Error('rate limited\ntry later') })
    expect(log.track(failure)).toBe(false)
    log.logError('photo.jpg', failure)
    expect(sink.error).toHaveBeenCalledWith('photo.jpg: rate limited try later')
    log.logItem('cached.png', result({ cacheWarning: 'read only' }))
    expect(sink.warn).toHaveBeenCalledWith('Cache unavailable for cached.png: read only')
    log.logSummary()
    expect(sink.info.mock.calls.at(-1)?.[0]).toContain('1 failed')
  })
  it.each(['en', 'zh-CN'] as const)('gives CLI and plugin specific conversion instructions in %s', (locale) => {
    const cli = setup({ locale, target: 'cli' })
    const plugin = setup({ locale, target: 'plugin' })
    cli.log.logConvertiblePngs(3)
    plugin.log.logConvertiblePngs(3)
    expect(cli.sink.info.mock.calls[0][0]).toContain('--convert')
    expect(plugin.sink.info.mock.calls[0][0]).toContain('convertPngToJpg: true')
    expect(plugin.sink.info.mock.calls[0][0]).toContain('renameConvertedFiles: true')
    expect(plugin.sink.info.mock.calls[0][0]).not.toContain('tinyimg convert')
    expect(cli.sink.warn).not.toHaveBeenCalled()
    expect(plugin.sink.warn).not.toHaveBeenCalled()
  })
  it('stays quiet for empty work and no conversion candidates', () => {
    const { log, sink } = setup()
    log.logStart(0)
    log.logSummary()
    log.logConvertiblePngs(0)
    expect(sink.info).not.toHaveBeenCalled()
  })
})
