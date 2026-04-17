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
    await runConvert({ paths: '', _: [], noRename: false }, deps)
    expect(deps.log).toHaveBeenCalled()
    expect(deps.matchFiles).not.toHaveBeenCalled()
  })

  it('skips PNGs with alpha channel', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/a.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(false)

    await runConvert({ paths: '/a.png', _: [], noRename: false }, deps)

    expect(deps.canConvertToJpg).toHaveBeenCalledWith('/a.png')
    expect(deps.convertPngToJpg).not.toHaveBeenCalled()
  })

  it('converts PNG to JPG and removes original', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/images/logo.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(true)
    deps.convertPngToJpg.mockResolvedValue(Buffer.from('jpg-data'))

    await runConvert({ paths: '/images/logo.png', _: [], noRename: false }, deps)

    expect(deps.convertPngToJpg).toHaveBeenCalledWith('/images/logo.png')
    expect(deps.writeFile).toHaveBeenCalledWith('/images/logo.jpg', Buffer.from('jpg-data'))
    expect(deps.unlink).toHaveBeenCalledWith('/images/logo.png')
  })

  it('keeps original filename when noRename is true', async () => {
    const deps = createDeps()
    deps.matchFiles.mockResolvedValue([{ path: '/images/logo.png', size: 100 }])
    deps.canConvertToJpg.mockResolvedValue(true)
    deps.convertPngToJpg.mockResolvedValue(Buffer.from('jpg-data'))

    await runConvert({ paths: '/images/logo.png', _: [], noRename: true }, deps)

    expect(deps.writeFile).toHaveBeenCalledWith('/images/logo.png', Buffer.from('jpg-data'))
    expect(deps.unlink).not.toHaveBeenCalled()
  })
})
