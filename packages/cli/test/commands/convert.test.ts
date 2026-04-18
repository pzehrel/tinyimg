import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { runConvert } from '../../src/commands/convert'

function createDeps() {
  return {
    matchFiles: vi.fn(),
    canConvertToJpg: vi.fn(),
    convertPngToJpg: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    log: vi.fn(),
  }
}

describe('convert command', () => {
  it('logs no files when inputs are empty', async () => {
    const deps = createDeps()
    await runConvert({ paths: '', _: [], rename: false }, deps)
    expect(deps.log).toHaveBeenCalled()
    expect(deps.matchFiles).not.toHaveBeenCalled()
  })

  it('skips PNGs with alpha channel without logging', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/a.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(false)

    await runConvert({ paths: '/a.png', _: [], rename: false, cwd: '/' }, deps)

    expect(deps.canConvertToJpg).toHaveBeenCalledWith('/a.png')
    expect(deps.convertPngToJpg).not.toHaveBeenCalled()
    expect(deps.log).not.toHaveBeenCalled()
  })

  it('keeps .png extension by default (rename=false)', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/images/logo.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(true)
    deps.convertPngToJpg.mockResolvedValue(Buffer.from('jpg-data'))

    await runConvert({ paths: '/images/logo.png', _: [], rename: false, cwd: '/' }, deps)

    expect(deps.convertPngToJpg).toHaveBeenCalledWith('/images/logo.png')
    expect(deps.writeFile).toHaveBeenCalledWith('/images/logo.png', Buffer.from('jpg-data'))
    expect(deps.unlink).not.toHaveBeenCalled()
    expect(deps.log).toHaveBeenCalledWith(
      expect.any(String),
      'images/logo.png',
    )
  })

  it('renames .png to .jpg when rename is true', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/images/logo.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(true)
    deps.convertPngToJpg.mockResolvedValue(Buffer.from('jpg-data'))

    await runConvert({ paths: '/images/logo.png', _: [], rename: true, cwd: '/' }, deps)

    expect(deps.convertPngToJpg).toHaveBeenCalledWith('/images/logo.png')
    expect(deps.writeFile).toHaveBeenCalledWith('/images/logo.jpg', Buffer.from('jpg-data'))
    expect(deps.unlink).toHaveBeenCalledWith('/images/logo.png')
    expect(deps.log).toHaveBeenCalledWith(
      expect.any(String),
      'images/logo.png',
      '→',
      'logo.jpg',
    )
  })
})
