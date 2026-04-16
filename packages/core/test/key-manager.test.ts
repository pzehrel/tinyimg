import { describe, expect, it } from 'vitest'
import { getKey, initKeyManager } from '../src/key-manager'

describe('key-manager', () => {
  it('initKeyManager and getKey should be functions', () => {
    expect(typeof initKeyManager).toBe('function')
    expect(typeof getKey).toBe('function')
  })
})
