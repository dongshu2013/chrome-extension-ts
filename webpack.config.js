const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    popup: ['./src/styles/main.css', './src/popup/popup.ts'],
    options: ['./src/styles/main.css', './src/popup/options.ts'],
    content: './src/content/content.ts',
    background: './src/background/background.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'public',
          to: '.'
        },
        {
          from: 'src/popup/*.html',
          to: '[name][ext]'
        }
      ],
    }),
  ],
  devtool: 'cheap-source-map'
};