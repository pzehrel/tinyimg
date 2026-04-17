import tinyimg from '@pzehrel/tinyimg-rsbuild'
import { defineConfig } from '@rsbuild/core'

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      maxFileSize: 5 * 1024 * 1024,
      convertPngToJpg: false,
      parallel: 3,
    }),
  ],
})
