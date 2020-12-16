const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const devServerEntries = [
  'webpack-dev-server/client?http://localhost:8080',
  'webpack/hot/only-dev-server',
];

const envPlugin = new webpack.EnvironmentPlugin(['NODE_ENV', 'RELAYER_API', 'INDEXER_API']);

const rules = [
  {
    test: /\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|.webpack)/,
    loaders: [{
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    }],
  },
];

const rendererRules = [
  {
    test: /\.(gif|png|jpe?g|svg)$/i,
    use: [
      'file-loader',
      {
        loader: 'image-webpack-loader',
        options: {
          publicPath: 'assets',
          bypassOnDebug: true, // webpack@1.x
          disable: true, // webpack@2.x and newer
        },
      },
    ],
  },
  {
    test: /\.(s[ac]ss|css)$/i,
    use: [
      // Creates `style` nodes from JS strings
      'style-loader',
      // Translates CSS into CommonJS
      'css-loader',
      // Compiles Sass to CSS
      'sass-loader',
    ],
  },
];

module.exports = [
  {
    mode: isProd ? 'production' : 'development',
    entry: './src/app/main.ts',
    target: 'electron-main',
    externals: [nodeExternals()],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [
        path.resolve('./node_modules')
      ]
    },
    module: {
      rules: [
        ...rules,
      ],
    },
    output: {
      path: __dirname + '/build',
      filename: 'electron.js',
    },
    plugins: [
      envPlugin,
    ],
  },
  {
    ...makeDevRendererBundle('app'),
    plugins: [
      envPlugin,
      new HtmlWebpackPlugin({
        template: './static/index.html',
      }),
    ],
  },
  makeDevRendererBundle('setting'),
];

function makeDevRendererBundle(name) {
  return {
    mode: isProd ? 'production' : 'development',
    entry: [
      ...(isProd ? [] : devServerEntries),
      `./src/ui/${name}.tsx`,
    ],
    target: 'electron-renderer',
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      modules: [
        path.resolve('./node_modules')
      ]
    },
    module: {
      rules: [
        ...rules,
        ...rendererRules,
      ],
    },
    output: {
      path: __dirname + '/build',
      publicPath: isProd ? './' : 'http://localhost:8080/',
      filename: `${name}.js`,
    },
    plugins: [
      envPlugin,
      new HtmlWebpackPlugin({
        template: `./static/${name}.html`,
        filename: `${name}.html`,
      }),
    ],
  };
}
