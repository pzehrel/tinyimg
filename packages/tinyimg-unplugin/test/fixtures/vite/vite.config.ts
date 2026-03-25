import { defineConfig } from 'vite'
import tinyimg from '../../../dist/index.mjs'

export default defineConfig({
  plugins: [
    tinyimg.vite({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true
    })
  ]
})
