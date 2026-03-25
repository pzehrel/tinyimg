import { defineConfig } from 'vite'
import tinyimg from 'tinyimg-unplugin'

export default defineConfig({
  plugins: [
    tinyimg({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true
    })
  ]
})
