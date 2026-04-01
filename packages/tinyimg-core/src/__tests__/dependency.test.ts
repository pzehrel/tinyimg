import { describe, expect, it } from 'vitest'

describe('tinify dependency removal', () => {
  it('should NOT have tinify package installed', async () => {
    const pkg = await import('../../package.json', { with: { type: 'json' } })
    expect(pkg.default.dependencies).toBeDefined()
    expect(pkg.default.dependencies.tinify).toBeUndefined()
  })

  it('should NOT import tinify successfully', async () => {
    await expect(async () => {
      await import('tinify')
    }).rejects.toThrow()
  })
})
