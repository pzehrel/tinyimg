const tinyimg = require('@pz4l/tinyimg-unplugin/webpack')
const Dotenv = require('dotenv-webpack')

module.exports = {
  mode: 'production',
  entry: './src/main',
  output: {
    path: require('node:path').resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
        type: 'asset',
      }
    ]
  },
  plugins: [
    new Dotenv(), // MUST come before tinyimg to load .env first
    tinyimg.default.webpack({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true
    })
  ]
}
