const tinyimg = require('tinyimg-unplugin')

module.exports = {
  mode: 'production',
  entry: './src/main',
  output: {
    path: require('node:path').resolve(__dirname, 'dist'),
    filename: 'bundle'
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
    tinyimg.default.webpack({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: true
    })
  ]
}
