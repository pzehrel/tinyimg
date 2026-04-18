import { describe, expect, it, vi } from 'vitest'
import { runCacheClear, runCacheInfo, runCacheList } from '../../src/commands/cache'

function createDeps() {
  return {
    getCacheDir: vi.fn().mockReturnValue('/project/node_modules/.tinyimg'),
    getUserCacheDir: vi.fn().mockReturnValue('/home/user/.tinyimg'),
    listCacheEntries: vi.fn().mockResolvedValue([]),
    clearCache: vi.fn().mockResolvedValue({ deleted: 0 }),
    confirm: vi.fn().mockResolvedValue(true),
    cwd: '/project',
    log: vi.fn(),
  }
}

describe('cache list', () => {
  it('shows no cache found when empty', async () => {
    const deps = createDeps()
    await runCacheList({ global: false }, deps)
    expect(deps.log).toHaveBeenCalled()
    const call = deps.log.mock.calls[0][0]
    expect(typeof call === 'string' && (call.includes('No cache') || call.includes('未找到缓存'))).toBe(true)
  })

  it('lists entries with md5, ext, and size', async () => {
    const deps = createDeps()
    deps.listCacheEntries.mockResolvedValue([
      { md5: 'abc123def456789', ext: 'png', size: 1024 },
      { md5: 'xyz789uvw012345', ext: 'jpg', size: 2048 },
    ])
    await runCacheList({ global: false }, deps)
    const lines = deps.log.mock.calls.map(c => c[0]).filter(Boolean)
    expect(lines.some(l => l.includes('abc123def456') && l.includes('png') && l.includes('1.0KB'))).toBe(true)
    expect(lines.some(l => l.includes('xyz789uvw012') && l.includes('jpg') && l.includes('2.0KB'))).toBe(true)
  })

  it('uses user cache with --global', async () => {
    const deps = createDeps()
    await runCacheList({ global: true }, deps)
    expect(deps.getUserCacheDir).toHaveBeenCalled()
  })
})

describe('cache info', () => {
  it('shows both project and user cache stats', async () => {
    const deps = createDeps()
    deps.listCacheEntries
      .mockResolvedValueOnce([{ md5: 'a', ext: 'png', size: 100 }])
      .mockResolvedValueOnce([{ md5: 'b', ext: 'jpg', size: 200 }])
    await runCacheInfo(deps)
    const lines = deps.log.mock.calls.map(c => c[0]).filter(Boolean)
    expect(lines.some(l => l.includes('Project') || l.includes('项目'))).toBe(true)
    expect(lines.some(l => l.includes('User') || l.includes('用户'))).toBe(true)
  })
})

describe('cache clear', () => {
  it('shows no cache found when empty', async () => {
    const deps = createDeps()
    await runCacheClear({ global: false, yes: false }, deps)
    expect(deps.log).toHaveBeenCalled()
    const call = deps.log.mock.calls[0][0]
    expect(typeof call === 'string' && (call.includes('No cache') || call.includes('未找到缓存'))).toBe(true)
  })

  it('skips confirmation with --yes', async () => {
    const deps = createDeps()
    deps.listCacheEntries.mockResolvedValue([{ md5: 'a', ext: 'png', size: 100 }])
    await runCacheClear({ global: false, yes: true }, deps)
    expect(deps.confirm).not.toHaveBeenCalled()
    expect(deps.clearCache).toHaveBeenCalled()
  })

  it('cancels when user declines confirmation', async () => {
    const deps = createDeps()
    deps.listCacheEntries.mockResolvedValue([{ md5: 'a', ext: 'png', size: 100 }])
    deps.confirm.mockResolvedValue(false)
    await runCacheClear({ global: false, yes: false }, deps)
    expect(deps.clearCache).not.toHaveBeenCalled()
  })
})
