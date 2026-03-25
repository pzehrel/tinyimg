const tinyimg = require('tinyimg-unplugin')

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    path: require('node:path').resolve(__dirname, 'dist'),
    filename: 'bundle.js'
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
