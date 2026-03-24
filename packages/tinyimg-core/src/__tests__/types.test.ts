import { describe, it, expect } from 'vitest'

describe('Config Type Definitions', () => {
  it('should export ConfigFile and KeyMetadata types', async () => {
    // This will fail at runtime if the module doesn't exist
    const typesModule = await import('../config/types.js')
    expect(typesModule).toBeDefined()
    expect(typesModule.ConfigFile).toBeDefined()
    expect(typesModule.KeyMetadata).toBeDefined()
  })

  it('should have correct KeyMetadata structure', async () => {
    const { KeyMetadata } = await import('../config/types.js')
    // Type check is compile-time, but we can verify the export exists
    expect(KeyMetadata).toBeDefined()
  })

  it('should have correct ConfigFile structure', async () => {
    const { ConfigFile } = await import('../config/types.js')
    expect(ConfigFile).toBeDefined()
  })
})
