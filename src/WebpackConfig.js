import extend from 'extend';
import path from 'path';
import webpack from 'webpack';
import fs from 'fs';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
const StatsPlugin = require('stats-webpack-plugin');

export default class WebpackConfig {

  constructor(ctx = {}) {
    Object.assign(this, ctx);
  }
  static getConfig(ctx, ...args) {
    const object = new this(ctx);
    return object.getConfig(...args);
  }

  resolvePath(...args) {
    if (this.dirname) return path.resolve(this.dirname, ...args);
    return path.resolve(...args);
  }

  getEnv() {
    return this.env || 'development';
  }

  getStage() {
    return this.stage || 'development';
  }

  isDebug() {
    if (this.debug == null) return true;
    return !!this.debug;
  }

  isSourcemap() {
    if (this.sourcemap == null) return this.isDebug();
    return !!this.sourcemap;
  }

  isCssSourcemap() {
    if (this.cssSourcemap == null) return false;
    return !!this.cssSourcemap;
  }

  isVerbose() {
    return !!this.verbose;
  }

  getGlobals() {
    // console.log({'process.env.NODE_ENV': JSON.stringify(this.getEnv()),});
    return {
      'process.env.NODE_ENV': JSON.stringify(this.getEnv()),
      __ENV__: JSON.stringify(this.getEnv()),
      __DEV__: this.getEnv() === 'development',
      __PROD__: this.getEnv() === 'production',
      __STAGE__: JSON.stringify(this.getStage()),
    };
  }

  getAutoprefixerBrowsers() {
    return [
      'Android 2.3',
      'Android >= 4',
      'Chrome >= 35',
      'Firefox >= 31',
      'Explorer >= 9',
      'iOS >= 7',
      'Opera >= 12',
      'Safari >= 7.1',
    ];
  }

  getDeps() {
    const deps = (this.deps || []).map(dep => ({
      ...dep,
      path: fs.realpathSync(dep.path),
    }));
    if (!this.modules || !this.modules.modules) return deps;
    const modules = this.modules.modules;
    const modulesDeps = Object
    .keys(modules)
    .filter(dep => modules[dep][0] !== '~')
    .map((dep) => {
      return {
        name: modules[dep],
        path: fs.realpathSync(`${this.dirname}/node_modules/${modules[dep]}/src`),
        alias: modules[dep],
      };
    });
    return [...deps, ...modulesDeps];
  }

  getBabelPresets() {
    return [
      '@babel/preset-react',
      '@babel/preset-es2015',
      '@babel/preset-stage-0',
      ['@babel/preset-env', {
        useBuiltIns: 'entry',
        targets: {
          forceAllTransforms: true,
        },
      }],
    ];
  }

  getBabelPlugins() {
    return [
      'module:jsx-control-statements',
      'react-require',
      'transform-decorators-legacy',
      'transform-class-properties'
    ];
  }

  getJsxLoader() {
    return {
      test: /\.(jsx|js)?$/,
      include: [
        ...this.getDeps().map(dep => dep.path),
        this.resolvePath('src'),
      ],
      // exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        // https://github.com/babel/babel-loader#options
        
        // https://babeljs.io/docs/usage/options/
        options: {
          //sourceMaps: this.isSourcemap(),
          cacheDirectory: this.isDebug(),
          babelrc: false,
          presets: this.getBabelPresets(),
          plugins: [
            ...this.getBabelPlugins(),
            ['@babel/plugin-transform-runtime', {
              polyfill: false
            }],
            ...(this.isDebug() ? [] : [
              'transform-react-remove-prop-types',
              '@babel/plugin-transform-react-constant-elements',
              // 'transform-react-inline-elements',
            ]),
          ],
        }
      },
    };
  }
  getCssLoaders() {
    const dimensions = [
      [
        {
          preExt: 'i?',
          loaders: [
            'isomorphic-style-loader',
          ],
        },
        {
          preExt: 'f',
          loaders: [
            ExtractTextPlugin.extract(
              'style-loader',
            ),
          ],
        },
      ],
      [
        {
          preExt: 'm?',
          loaders: [
            `css-loader?${JSON.stringify({
              sourceMap: this.isCssSourcemap(),
              modules: true,
              localIdentName: this.isDebug() ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
              minimize: !this.isDebug(),
            })}`,
          ],
        },
        {
          preExt: 'g',
          loaders: [
            `css-loader?${JSON.stringify({
              sourceMap: this.isCssSourcemap(),
              modules: false,
              minimize: !this.isDebug(),
            })}`,
          ],
        },
      ],
      [
        {
          ext: 'p?css',
          // name: '\\.css',
          loaders: [
            'postcss-loader?pack=default',
          ],
        },
        {
          ext: '(sass|scss)',
          loaders: [
            'postcss-loader?pack=sass',
            'sass-loader',
          ],
        },
      ],
    ];
    function getVectors(dimensions) {
      let results = [];
      for (var i = 0; i < dimensions[0]; i++) {
        if (dimensions.length <= 1) {
          results = [...results, [i]];
        } else {
          results = [...results, ...getVectors(dimensions.slice(1)).map((d) => {
            return [i, ...d];
          })];
        }
      }
      return results;
    }
    const vectors = getVectors(dimensions.map(d => d.length));
    const testers = vectors.map((vector) => {
      const tester = {
        loaders: [],
      };
      let ext = '';
      let preExt = '';
      vector.forEach((v, i) => {
        const subtest = dimensions[i][v];
        ext += subtest.ext || '';
        preExt += subtest.preExt || '';
        tester.loaders = [
          ...tester.loaders,
          ...subtest.loaders,
        ];
      });

      const test = `${preExt ? `\.${preExt}` : ''}${ext ? `\.${ext}` : ''}`;

      tester.test = new RegExp(test);
      return tester;
    });
    const getPostcssModule = (bundle) => this.getPostcssModule(bundle);
    return [
      // ...testers,
      // {
      //   test: /\.xcss$/,
      //   loaders: [
      //     ExtractTextPlugin.extract(
      //       'style-loader',
      //     ),
      //     `css-loader?${JSON.stringify({
      //       sourceMap: this.isDebug(),
      //       modules: false,
      //       minimize: !this.isDebug(),
      //     })}`,
      //     'postcss-loader?pack=default',
      //   ],
      // },
      {
        test: /\.g(lobal)?\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: this.isSourcemap(),
                modules: false,
                minimize: !this.isDebug(),
              }
            }, {
              loader: 'postcss-loader',
              options: {
                // pack: 'default',
                plugins: getPostcssModule
              }
            }
          ]
          })
        /*[
          ExtractTextPlugin.extract(
            'style-loader',
          ),
          `css-loader?${JSON.stringify({
            sourceMap: this.isSourcemap(),
            modules: false,
            minimize: !this.isDebug(),
          })}`,
          'postcss-loader?pack=default',
        ]*/,
      },
      {
        test: /\.css$/,
        exclude: /\.g(lobal)?\.css$/,
        use: [
          'isomorphic-style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: this.isSourcemap(),
              modules: true,
              localIdentName: this.isDebug() ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
              minimize: !this.isDebug(),
            }
          }, {
            loader: 'postcss-loader',
            options: {
              // pack: 'default',
              plugins: getPostcssModule
            }
          }
          /*`css-loader?${JSON.stringify({
            sourceMap: this.isSourcemap(),
            modules: true,
            localIdentName: this.isDebug() ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
            minimize: !this.isDebug(),
          })}`,
          'postcss-loader?pack=default',*/
        ],
      },
      {
        test: /\.igscss$/,
        use: [
          'isomorphic-style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: this.isSourcemap(),
              modules: false,
              minimize: !this.isDebug(),  
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              // pack: 'sass',
              plugins: getPostcssModule
            }
          },
          'sass-loader'
          /*`css-loader?${JSON.stringify({
            sourceMap: this.isSourcemap(),
            modules: false,
            minimize: !this.isDebug(),
          })}`,
          'postcss-loader?pack=sass',
          'sass-loader',*/
        ],
      },
      {
        test: /\.g(lobal)?\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: this.isSourcemap(),
                modules: false,
                minimize: !this.isDebug(),
              }
            }, {
              loader: 'postcss-loader',
              options: {
                // pack: 'sass',
                plugins: getPostcssModule
              }
            }, 
            'sass-loader'
          ]
        })
        /*[
          ExtractTextPlugin.extract(
            'style-loader',
          ),
          `css-loader?${JSON.stringify({
            sourceMap: this.isSourcemap(),
            modules: false,
            minimize: !this.isDebug(),
          })}`,
          'postcss-loader?pack=sass',
          'sass-loader',
        ]*/,
      },
      {
        test: /\.scss$/,
        exclude: /\.g(lobal)?\.scss$/,
        use: [
          'isomorphic-style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: this.isSourcemap(),
              modules: true,
              localIdentName: this.isDebug() ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
              minimize: !this.isDebug(),  
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              // pack: 'sass',
              plugins: getPostcssModule
            }
          },
          'sass-loader',
          /*`css-loader?${JSON.stringify({
            sourceMap: this.isSourcemap(),
            modules: true,
            localIdentName: this.isDebug() ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
            minimize: !this.isDebug(),
          })}`,
          'postcss-loader?pack=sass',
          'sass-loader',*/
        ],
      },
    ];
  }
  getPostcssModule(bundler) {
    return [
      require('postcss-import')({
        addDependencyTo: bundler,
        path: [
          this.resolvePath('src'),
          ...this.getDeps().map(dep => dep.path),
          this.resolvePath('node_modules'),
        ],
        trigger: '&',
        resolve: require('./utils/resolve-id'),
      }),
      require('postcss-mixins')(),
      // require('postcss-custom-properties')(),
      require('postcss-simple-vars')(), // / !
      // require('postcss-custom-media')(),
      // require('postcss-media-minmax')(),
      // require('postcss-custom-selectors')(),
      // require('postcss-calc')(),
      // require('postcss-nesting')(),
      require('postcss-color-function')(),
      // require('pleeease-filters')(),
      // require('pixrem')(),
      // require('postcss-selector-matches')(),
      // require('postcss-selector-not')(),
      // require('postcss-animation')(), // / !
      // require('rucksack-css')(), // / !
      // require('lost')(), // / !
      require('postcss-nested')(), // / !
      require('autoprefixer')({ browsers: this.getAutoprefixerBrowsers() }),
    ];
  }
  getLoaders() {
    return [
      this.getJsxLoader(),
      ...this.getCssLoaders(),
      {
        test: /\.json$/,
        use: {
          loader: 'json-loader'
        }
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)(\?.+)?$/,
        use: {
          loader: 'url-loader',
          options: {
            name: this.isDebug() ? '[path][name].[ext]?[hash]' : '[hash].[ext]',
            limit: 8192,
          },
        },
      },
      {
        test: /\.(woff(2)?)(\?.+)?$/,
        use: {
          loader: 'url-loader',
          options: {
            name: this.isDebug() ? '[path][name].[ext]?[hash]' : '[hash].[ext]',
            mimetype: 'application/font-woff',
            limit: 8192,
          },
        },
      },
      {
        test: /\.(eot|ttf|wav|mp3)(\?.+)?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: this.isDebug() ? '[path][name].[ext]?[hash]' : '[hash].[ext]',
          },
        },
      },
    ];
  }

  getModule() {
    return {
      rules: this.getLoaders(),
    };
  }

  getPlugins() {
    return [
      // Define free variables
      // https://webpack.github.io/docs/list-of-plugins.html#defineplugin
      new webpack.LoaderOptionsPlugin({
        debug: this.isDebug(),
      }),
      new webpack.DefinePlugin(this.getGlobals()),
      new ExtractTextPlugin(this.isDebug() ? '[name].css?[chunkhash]' : '[name].[chunkhash].css'),
      ...!this.webpackStats ? [] : [new StatsPlugin(`webpack.${this.getTarget() === 'node' ? 'server' : 'client'}.stats.json`, this.webpackStats)],
      new webpack.ProvidePlugin({
        Promise: 'bluebird',
      }),
    ];
  }

  getResolve() {
    return {
      /* root: this.resolvePath('src'),
      modulesDirectories: ['node_modules'],*/
      alias: this.getResolveAlias(),
      extensions: this.getResolveExtensions(),
      modules: [
        this.resolvePath('src'),
        "node_modules",
      ]
    };
  }

  getResolveExtensions() {
    return ['.webpack.js', '.web.js', '.js', '.jsx', '.json'];
  }

  getResolveAlias() {
    const alias = {
      '~': this.resolvePath('src'),
    };
    this.getDeps().forEach((dep) => {
      if (dep.alias) {
        alias[dep.alias] = dep.path;
      }
    });

    return Object.assign(alias, this.alias || {});
  }

  getStats() {
    return {
      colors: true,
      reasons: this.isDebug(),
      hash: this.isVerbose(),
      version: this.isVerbose(),
      timings: true,
      chunks: this.isVerbose(),
      chunkModules: this.isVerbose(),
      cached: this.isVerbose(),
      cachedAssets: this.isVerbose(),
      modules: false,
    };
  }

  getEntryPrefix() {
    return [];
    // return ['babel-polyfill'];
  }

  getEntry() {
    return 'index.js';
  }

  getFullEntry() {
    const entry = this.getEntry();
    return Array.isArray(entry) ? [...this.getEntryPrefix(), ...entry] : [...this.getEntryPrefix(), entry];
  }

  getOutput() {
    return {
      path: this.resolvePath('build/public/assets'),
      publicPath: '/assets/',
      sourcePrefix: '  ',
    };
  }

  getPreConfig() {
    return {
      context: this.resolvePath('src'),
      target: this.getTarget(),
      entry: this.getFullEntry(),
      resolve: this.getResolve(),
      output: this.getOutput(),
      module: this.getModule(),
      plugins: this.getPlugins(),
      cache: this.isDebug(),
      // debug: this.isDebug(),
      bail: !this.isDebug(),
      stats: this.getStats(),
      // postcss: (...args) => this.getPostcssModule(...args),
    };
  }

  getConfig(withoutMerge) {
    const config = this.getPreConfig();
    if (!this.webpack || withoutMerge) return config;
    // return Object.extend({}, config, this.webpack)
    return extend(true, config, this.webpack);
  }

}
