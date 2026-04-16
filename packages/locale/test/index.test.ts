import { describe, expect, it } from 'vitest'
import { createI18n } from '../src/index'

describe('createI18n', () => {
  it('should interpolate params', () => {
    const t = createI18n('en', { hello: 'Hello {name}' })
    expect(t('hello', { name: 'World' })).toBe('Hello World')
  })
})
