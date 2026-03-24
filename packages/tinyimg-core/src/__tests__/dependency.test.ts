import { describe, it, expect } from 'vitest'

describe('tinify dependency', () => {
  it('should have tinify package installed', async () => {
    const pkg = await import('../../package.json', { with: { type: 'json' } })
    expect(pkg.default.dependencies).toBeDefined()
    expect(pkg.default.dependencies.tinify).toBeDefined()
  })

  it('should have tinify version 1.8.2', async () => {
    const pkg = await import('../../package.json', { with: { type: 'json' } })
    expect(pkg.default.dependencies.tinify).toBe('1.8.2')
  })

  it('should import tinify successfully', async () => {
    const tinify = await import('tinify')
    expect(tinify).toBeDefined()
    expect(tinify.default).toBeDefined()
  })
})
