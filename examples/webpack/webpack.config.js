import TinyimgWebpackPlugin from '@pzehrel/tinyimg-webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'

/** @type {import('webpack').Configuration} */
export default {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: new URL('./dist', import.meta.url).pathname,
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|webp)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ts$/i,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new TinyimgWebpackPlugin({
      strategy: 'AUTO',
      maxFileSize: 5 * 1024 * 1024,
      convertPngToJpg: false,
      parallel: 3,
    }),
  ],
}
