import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { runList } from '../../src/commands/list'

function createDeps() {
  return {
    matchFiles: vi.fn(),
    readCache: vi.fn(),
    access: vi.fn(),
    cwd: '/project',
    log: vi.fn(),
  }
}

describe('list command', () => {
  it('outputs JSON when json flag is true', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/project/a.png', size: 100, md5: 'abc', convertible: true }])

    await runList({ paths: './', _: [], json: true, convert: false }, deps)

    expect(deps.log).toHaveBeenCalledTimes(1)
    const output = JSON.parse(deps.log.mock.calls[0][0])
    expect(output).toHaveLength(1)
    expect(output[0].path).toBe('/project/a.png')
  })

  it('filters convertible files when convert flag is true', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([
      { path: '/project/a.png', size: 100, md5: 'a', convertible: true },
      { path: '/project/b.png', size: 200, md5: 'b', convertible: false },
    ])
    deps.access.mockRejectedValue(new Error('no cache'))

    await runList({ paths: './', _: [], json: false, convert: true }, deps)

    const lines = deps.log.mock.calls.map(c => c[0])
    expect(lines.some(l => l.includes('a.png'))).toBe(true)
    expect(lines.some(l => l.includes('b.png'))).toBe(false)
  })

  it('prints summary with cached and convertible counts', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([
      { path: '/project/a.png', size: 100, md5: 'a', convertible: true },
    ])
    deps.access.mockResolvedValue(undefined)
    deps.readCache.mockResolvedValue(Buffer.from('cached'))

    await runList({ paths: './', _: [], json: false, convert: false }, deps)

    const summary = deps.log.mock.calls[deps.log.mock.calls.length - 1][0]
    expect(summary).toContain('1')
    expect(summary).toContain('100B')
  })
})
