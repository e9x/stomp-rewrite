import { appDist, appNodeModules, appPath, appSrc } from './paths.js';
import { resolve } from 'path';
import ResolveTypescriptPlugin from 'resolve-typescript-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';

const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true';

const isEnvDevelopment = process.env.NODE_ENV === 'development';
const isEnvProduction = process.env.NODE_ENV === 'production';

const isEnvProductionProfile =
	isEnvProduction && process.argv.includes('--profile');

/**
 * @type {import('webpack').Configuration}
 */
const common = {
	devtool: isEnvProduction ? 'source-map' : 'eval-source-map',
	mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
		plugins: [new ResolveTypescriptPlugin()],
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
			new (await import('eslint-webpack-plugin')).default({
				// Plugin options
				extensions: ['js', 'mjs'],
				formatter: 'react-dev-utils/eslintFormatter',
				eslintPath: 'eslint',
				failOnError: !(isEnvDevelopment && emitErrorsAsWarnings),
				context: appSrc,
				cache: true,
				cacheLocation: resolve(appNodeModules, '.cache/.eslintcache'),
				// ESLint class options
				cwd: appPath,
				resolvePluginsRelativeTo: appPath,
			}),
	].filter(Boolean),
};

/**
 * @type {import('webpack').Configuration[]}
 */
export default [
	{
		...common,
		plugins: [
			...common.plugins,
			new webpack.ProvidePlugin({
				...Object.fromEntries(
					[
						'Reflect',
						'fetch',
						'XMLHttpRequest',
						'EventSource',
						'Function',
						'AsyncFunction',
					].map(name => [name, [resolve('./src/inject/snapshot.ts'), name]])
				),
				'Error.captureStackTrace': 'capture-stack-trace',
			}),
		],
		entry: {
			injectWorker: './src/inject/worker.ts',
			injectDocument: './src/inject/document.ts',
		},
		output: {
			library: {
				name: 'createClient',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	},
	{
		...common,
		entry: {
			serviceWorker: './src/server/serviceWorker.ts',
		},
		output: {
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	},
	{
		...common,
		entry: {
			Bootstrapper: './src/bootstrapper/Bootstrapper.ts',
		},
		output: {
			library: {
				name: 'StompBootstrapper',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	},
	{
		...common,
		entry: {
			SearchBuilder: './src/bootstrapper/SearchBuilder.ts',
		},
		output: {
			library: {
				name: 'SearchBuilder',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	},
];
