const tinyimg = require('tinyimg-unplugin')

module.exports = {
  mode: 'production',
  entry: './src/main',
  output: {
    path: require('node:path').resolve(__dirname, 'dist'),
    filename: 'bundle'
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
