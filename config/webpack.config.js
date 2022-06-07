'use strict';

const path = require('path');
const paths = require('./paths');
const TerserPlugin = require('terser-webpack-plugin');

const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true';

module.exports = function (webpackEnv) {
	const isEnvDevelopment = webpackEnv === 'development';
	const isEnvProduction = webpackEnv === 'production';

	const isEnvProductionProfile =
		isEnvProduction && process.argv.includes('--profile');

	/**
	 * @type {import('webpack').Configuration}
	 */
	const common = {
		devtool: isEnvProduction ? 'source-map' : 'eval-source-map',
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
			],
		},
		optimization: {
			minimize: isEnvProduction,
			minimizer: [
				// This is only used in production mode
				new TerserPlugin({
					terserOptions: {
						parse: {
							// We want terser to parse ecma 8 code. However, we don't want it
							// to apply any minification steps that turns valid ecma 5 code
							// into invalid ecma 5 code. This is why the 'compress' and 'output'
							// sections only apply transformations that are ecma 5 safe
							// https://github.com/facebook/create-react-app/pull/4234
							ecma: 8,
						},
						compress: {
							ecma: 5,
							warnings: false,
							// Disabled because of an issue with Uglify breaking seemingly valid code:
							// https://github.com/facebook/create-react-app/issues/2376
							// Pending further investigation:
							// https://github.com/mishoo/UglifyJS2/issues/2011
							comparisons: false,
							// Disabled because of an issue with Terser breaking valid code:
							// https://github.com/facebook/create-react-app/issues/5250
							// Pending further investigation:
							// https://github.com/terser-js/terser/issues/120
							inline: 2,
						},
						mangle: {
							safari10: true,
						},
						// Added for profiling in devtools
						keep_classnames: isEnvProductionProfile,
						keep_fnames: isEnvProductionProfile,
						output: {
							ecma: 5,
							comments: false,
							// Turned on because emoji and regex is not minified properly using default
							// https://github.com/facebook/create-react-app/issues/2488
							ascii_only: true,
						},
					},
				}),
			],
		},
		plugins: [
			isEnvDevelopment &&
				new (require('eslint-webpack-plugin'))({
					// Plugin options
					extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
					formatter: require.resolve('react-dev-utils/eslintFormatter'),
					eslintPath: require.resolve('eslint'),
					failOnError: !(isEnvDevelopment && emitErrorsAsWarnings),
					context: paths.appSrc,
					cache: true,
					cacheLocation: path.resolve(
						paths.appNodeModules,
						'.cache/.eslintcache'
					),
					// ESLint class options
					cwd: paths.appPath,
					resolvePluginsRelativeTo: __dirname,
				}),
		].filter(Boolean),
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
		},
	};

	return [
		{
			...common,
			entry: {
				serviceWorker: './src/serviceWorker.ts',
				workerClient: './src/workerClient.ts',
				documentClient: './src/documentClient.ts',
			},
			output: {
				filename: '[name].js',
				path: paths.appBuild,
			},
		},
		{
			...common,
			entry: {
				bootstrapper: './src/bootstrapper.ts',
			},
			output: {
				library: {
					name: 'StompBootstrapper',
					type: 'umd',
				},
				filename: '[name].js',
				path: paths.appBuild,
			},
		},
	];
};
