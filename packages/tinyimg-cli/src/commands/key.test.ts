import process from 'node:process'
import { queryQuota, readConfig, validateKey, writeConfig } from '@pz4l/tinyimg-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../utils/logger'
import { keyAdd, keyList, keyRemove } from './key'

// Mock dependencies
vi.mock('@pz4l/tinyimg-core', () => ({
  maskKey: vi.fn((k: string) => `${k.slice(0, 4)}...${k.slice(-4)}`),
  queryQuota: vi.fn(),
  readConfig: vi.fn(),
  validateKey: vi.fn(),
  writeConfig: vi.fn(),
}))

vi.mock('../utils/logger', () => ({
  logger: {
    setLevel: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
  },
}))

describe('keyAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(readConfig).mockReturnValue({ keys: [] })
  })

  it('shows success on valid key', async () => {
    vi.mocked(validateKey).mockResolvedValue(true)

    await keyAdd('test-api-key-12345678')

    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('added successfully'))
    expect(writeConfig).toHaveBeenCalled()
  })

  it('shows error on invalid key', async () => {
    vi.mocked(validateKey).mockResolvedValue(false)

    await keyAdd('invalid-key')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid API key'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('warns when key already exists', async () => {
    vi.mocked(validateKey).mockResolvedValue(true)
    vi.mocked(readConfig).mockReturnValue({
      keys: [{
        key: 'test-api-key-12345678',
        valid: true,
        lastCheck: new Date().toISOString(),
      }],
    })

    await keyAdd('test-api-key-12345678')

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'))
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('shows error on credential error', async () => {
    vi.mocked(validateKey).mockRejectedValue(new Error('Unauthorized: Invalid credentials'))

    await keyAdd('some-key')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid API key'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('shows error on network error', async () => {
    vi.mocked(validateKey).mockRejectedValue(new Error('Network error'))

    await keyAdd('some-key')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error validating key'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})

describe('keyRemove', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows success when key removed', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [{
        key: 'test-api-key-12345678',
        valid: true,
        lastCheck: new Date().toISOString(),
      }],
    })

    await keyRemove('test-api-key-12345678')

    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('removed successfully'))
    expect(writeConfig).toHaveBeenCalled()
  })

  it('shows error when key not found', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [{
        key: 'other-key',
        valid: true,
        lastCheck: new Date().toISOString(),
      }],
    })

    await keyRemove('non-existent-key')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('warns when no keys configured', async () => {
    vi.mocked(readConfig).mockReturnValue({ keys: [] })

    await keyRemove()

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No API keys configured'))
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('shows error on unexpected error', async () => {
    vi.mocked(readConfig).mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    await keyRemove('some-key')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error removing key'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})

describe('keyList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows all keys with mask, status, and quota', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [
        {
          key: 'test-api-key-12345678',
          valid: true,
          lastCheck: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(queryQuota).mockResolvedValue(400)

    await keyList()

    expect(logger.info).toHaveBeenCalledWith('API Keys:')
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Valid'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Quota:'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('remaining'))
  })

  it('shows invalid keys in red', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [
        {
          key: 'test-api-key-12345678',
          valid: false,
          lastCheck: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(queryQuota).mockResolvedValue(0)

    await keyList()

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid'))
  })

  it('shows total summary line', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [
        {
          key: 'test-api-key-12345678',
          valid: true,
          lastCheck: new Date().toISOString(),
        },
        {
          key: 'test-api-key-87654321',
          valid: false,
          lastCheck: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(queryQuota)
      .mockResolvedValueOnce(400)
      .mockResolvedValueOnce(0)

    await keyList()

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Total:'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2 keys'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1 valid'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('quota remaining'))
  })

  it('warns when no keys configured', async () => {
    vi.mocked(readConfig).mockReturnValue({ keys: [] })

    await keyList()

    expect(logger.warn).toHaveBeenCalledWith('No API keys configured.')
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('tinyimg key add'))
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('shows warning when quota query fails', async () => {
    vi.mocked(readConfig).mockReturnValue({
      keys: [
        {
          key: 'test-api-key-12345678',
          valid: true,
          lastCheck: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(queryQuota).mockRejectedValue(new Error('Network error'))

    await keyList()

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unable to query'))
  })

  it('shows error on unexpected error', async () => {
    vi.mocked(readConfig).mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    await keyList()

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error listing keys'))
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
