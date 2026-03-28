import { config } from 'dotenv'
import replace from '@rollup/plugin-replace'
import tinyimg from '@pz4l/tinyimg-unplugin/rolldown'

// Load .env file
config()

export default {
  input: './src/main.js',
  output: {
    dir: './dist',
    format: 'es'
  },
  plugins: [
    // CRITICAL: Must be first for dead code elimination
    replace({
      'process.env.TINYPNG_KEYS': JSON.stringify(process.env.TINYPNG_KEYS),
      preventAssignment: true
    }),
    tinyimg({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true
    })
  ]
}
