const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    background: './src/background/background.ts',
    popup: './src/popup/popup.ts',
    content: './src/content/content.ts',
    sidepanel: './src/popup/sidepanel.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    // Copy static files
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '.' },
        {
          from: 'src/popup/popup.html',
          to: '[name][ext]'
        },
        {
          from: 'src/popup/sidepanel.html',
          to: '[name][ext]'
        }
      ]
    }),
    // Provide environment variables to the application
    new webpack.DefinePlugin({
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY || ''),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
};