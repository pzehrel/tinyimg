import { expect, it } from 'vitest'
import { runHostFixture } from '../../core/test/host-fixture'

for (const host of ['webpack-previous', 'webpack']) {
  it(`published Webpack plugin builds and renames assets on ${host}`, async () => {
    expect(await runHostFixture('webpack', host)).toBe('compatible')
  }, 40000)
}
