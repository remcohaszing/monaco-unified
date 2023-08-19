import { fileURLToPath } from 'url'

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import HtmlWebPackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const monacoUnified = new URL('../../', import.meta.url)
const nodeModules = new URL('node_modules/', monacoUnified)

export default {
  output: {
    filename: '[contenthash].js',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
    },
    alias: {
      'monaco-unified': fileURLToPath(monacoUnified),
      'decode-named-character-reference': fileURLToPath(
        new URL('decode-named-character-reference/index.js', nodeModules),
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        // Monaco editor uses .ttf icons.
        test: /\.(svg|ttf)$/,
        type: 'asset/resource',
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: { transpileOnly: true },
      },
    ],
  },
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  plugins: [new HtmlWebPackPlugin(), new MiniCssExtractPlugin({ filename: '[contenthash].css' })],
}
