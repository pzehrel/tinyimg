import { addUserKeys, listProjectKeys, listUserKeys, removeUserKey, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runKeysAdd, runKeysDel, runKeysList } from '../../src/commands/keys'

vi.mock('@pzehrel/tinyimg-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@pzehrel/tinyimg-core')>()
  return {
    ...actual,
    addUserKeys: vi.fn(),
    removeUserKey: vi.fn(),
    initKeyManager: vi.fn(),
    listProjectKeys: vi.fn(),
    listUserKeys: vi.fn(),
    resolveProjectKeysFromEnv: vi.fn(),
  }
})

function createMockConsole() {
  return {
    log: vi.fn(),
  }
}

describe('keys command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('runKeysAdd', () => {
    it('logs success for valid keys', async () => {
      vi.mocked(addUserKeys).mockResolvedValue([
        { key: 'abc***', valid: true, remaining: 100 },
      ])
      const console_ = createMockConsole()

      await runKeysAdd({ keys: 'mykey', _: [] }, console_)

      expect(addUserKeys).toHaveBeenCalledWith(['mykey'])
      expect(console_.log).toHaveBeenCalled()
      const msg = console_.log.mock.calls[0].join(' ')
      expect(msg).toContain('abc***')
    })

    it('logs failure for invalid keys', async () => {
      vi.mocked(addUserKeys).mockResolvedValue([
        { key: 'bad***', valid: false, error: 'Invalid key' },
      ])
      const console_ = createMockConsole()

      await runKeysAdd({ keys: 'badkey', _: [] }, console_)

      const msg = console_.log.mock.calls[0].join(' ')
      expect(msg).toContain('bad***')
      expect(msg).toContain('Invalid key')
    })
  })

  describe('runKeysDel', () => {
    it('calls removeUserKey and logs success', async () => {
      vi.mocked(removeUserKey).mockResolvedValue(undefined)
      const console_ = createMockConsole()

      await runKeysDel({ maskedKey: 'abc***' }, console_)

      expect(removeUserKey).toHaveBeenCalledWith('abc***')
      expect(console_.log).toHaveBeenCalled()
    })
  })

  describe('runKeysList', () => {
    it('shows no keys message when both lists are empty', async () => {
      vi.mocked(resolveProjectKeysFromEnv).mockReturnValue([])
      vi.mocked(listProjectKeys).mockReturnValue([])
      vi.mocked(listUserKeys).mockResolvedValue([])
      const console_ = createMockConsole()

      await runKeysList(console_)

      expect(console_.log).toHaveBeenCalledTimes(1)
    })

    it('shows project and user keys', async () => {
      vi.mocked(resolveProjectKeysFromEnv).mockReturnValue(['p1'])
      vi.mocked(listProjectKeys).mockReturnValue([{ key: 'proj***', used: 10, remaining: 490 }])
      vi.mocked(listUserKeys).mockResolvedValue([{ key: 'user***', used: 5, remaining: 495 }])
      const console_ = createMockConsole()

      await runKeysList(console_)

      expect(console_.log).toHaveBeenCalledTimes(4)
    })
  })
})
