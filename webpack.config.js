const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    popup: './src/popup/popup.ts',
    options: './src/popup/options.ts',
    content: './src/content/content.ts',
    background: './src/background/background.ts',
    sidepanel: './src/popup/sidepanel.ts'
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
    ],
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
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