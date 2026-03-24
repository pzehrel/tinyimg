import { describe, expect, it } from 'vitest'

describe('config Type Definitions', () => {
  it('should export types module', async () => {
    // Verify the module can be imported
    const typesModule = await import('../config/types')
    expect(typesModule).toBeDefined()
  })

  it('should have ConfigFile type at compile time', () => {
    // This test verifies type checking works - if ConfigFile doesn't exist,
    // TypeScript will fail to compile this test
    type ConfigFile = import('../config/types').ConfigFile
    const config: ConfigFile = { keys: [] }
    expect(config.keys).toEqual([])
  })

  it('should have KeyMetadata type at compile time', () => {
    // This test verifies type checking works - if KeyMetadata doesn't exist,
    // TypeScript will fail to compile this test
    type KeyMetadata = import('../config/types').KeyMetadata
    const metadata: KeyMetadata = {
      key: 'test_key',
      valid: true,
      lastCheck: '2026-03-24T00:00:00Z',
    }
    expect(metadata.key).toBe('test_key')
    expect(metadata.valid).toBe(true)
    expect(metadata.lastCheck).toBe('2026-03-24T00:00:00Z')
  })
})
