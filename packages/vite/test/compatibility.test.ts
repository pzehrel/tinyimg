import { expect, it } from 'vitest'
import { runHostFixture } from '../../core/test/host-fixture'

for (const host of ['vite5', 'vite6', 'vite7', 'vite']) {
  it(`published Vite plugin builds and renames assets on ${host}`, async () => {
    expect(await runHostFixture('vite', host)).toBe('compatible')
  }, 40000)
}
