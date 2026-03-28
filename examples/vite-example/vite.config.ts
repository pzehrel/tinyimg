import tinyimg from '@pz4l/tinyimg-unplugin/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tinyimg({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true,
    }),
  ],
})
