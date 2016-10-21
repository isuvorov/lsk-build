import webpack from 'webpack';
import AssetsPlugin from 'assets-webpack-plugin';
import WebpackConfig from './WebpackConfig'

export default class WebpackClientConfig extends WebpackConfig {
  getTarget() {
    return 'web'
  }

  getEntry() {
    return './client.js'
  }



  getGlobals() {
    return {
      ...super.getGlobals(),
      __SERVER__: false,
      __CLIENT__: true,
      __BROWSER__: true,
    }
  }

  getPreConfig() {
    return {
      ...super.getPreConfig(),
      devtool: this.isDebug() ? 'cheap-module-eval-source-map' : false,
    }
  }

  getOutput() {
    return {
      ...super.getOutput(),
      filename: this.isDebug() ? '[name].js?[chunkhash]' : '[name].[chunkhash].js',
      chunkFilename: this.isDebug() ? '[name].[id].js?[chunkhash]' : '[name].[id].[chunkhash].js',
    }
  }

  getPlugins() {
    return [
      ...super.getPlugins(),
      // Emit a file with assets paths
      // https://github.com/sporto/assets-webpack-plugin#options
      new AssetsPlugin({
        path: this.resolvePath('build'),
        filename: 'assets.js',
        processOutput: x => `module.exports = ${JSON.stringify(x)};`,
      }),

      // Assign the module and chunk ids by occurrence count
      // Consistent ordering of modules required if using any hashing ([hash] or [chunkhash])
      // https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
      new webpack.optimize.OccurrenceOrderPlugin(true),

      ...this.isDebug() ? [] : [

        // Search for equal or similar files and deduplicate them in the output
        // https://webpack.github.io/docs/list-of-plugins.html#dedupeplugin
        new webpack.optimize.DedupePlugin(),

        // Minimize all JavaScript output of chunks
        // https://github.com/mishoo/UglifyJS2#compressor-options
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            screw_ie8: true, // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
            warnings: this.isVerbose(),
          },
        }),

        // A plugin for a more aggressive chunk merging strategy
        // https://webpack.github.io/docs/list-of-plugins.html#aggressivemergingplugin
        new webpack.optimize.AggressiveMergingPlugin(),
      ],
    ]
  }
}