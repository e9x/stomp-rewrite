import ExcludeProvidePlugin from './ExcludeProvidePlugin.js';
import { appDist, appNodeModules, appPath, appSrc } from './paths.js';
import { resolve } from 'path';
import ResolveTypescriptPlugin from 'resolve-typescript-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';

const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true';

const isEnvDevelopment = process.env.NODE_ENV === 'development';
const isEnvProduction = process.env.NODE_ENV === 'production';

/**
 * @param {string} tsConfigFile
 * @param {import('webpack').Configuration} config
 * @returns {import('webpack').Configuration}
 */
const common = async (tsConfigFile, config) => ({
	entry: config.entry,
	output: config.output,
	devtool: isEnvProduction ? 'source-map' : 'eval-source-map',
	mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
	module: {
		...(config.module || {}),
		rules: [
			...(config.module?.rules || []),
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: resolve(process.cwd(), tsConfigFile),
					},
				},
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
		plugins: [new ResolveTypescriptPlugin()],
	},
	optimization: {
		minimize: isEnvProduction,
		minimizer: [new TerserPlugin()],
	},
	plugins: [
		...(config.plugins || []),
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
});

const snapshot = new webpack.ProvidePlugin({
	...Object.fromEntries(
		[
			'Reflect',
			'fetch',
			'XMLHttpRequest',
			'XMLHttpRequestEventTarget',
			'EventSource',
			'Function',
			'AsyncFunction',
		].map((name) => [name, [resolve('./src/inject/snapshot.ts'), name]])
	),
});

/**
 * @type {import('webpack').Configuration[]}
 */
export default [
	await common('./src/inject/worker/tsconfig.json', {
		plugins: [snapshot],
		entry: './src/inject/worker/worker.ts',
		output: {
			library: {
				name: 'createClient',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: 'injectWorker.js',
			path: appDist,
		},
	}),
	/*
	await common('./src/inject/dom/tsconfig.json', {
		plugins: [
			snapshot,
			new webpack.ProvidePlugin({
				...Object.fromEntries(
					['DOMParser', 'navigator'].map((name) => [
						name,
						[resolve('./src/inject/dom/snapshot.ts'), name],
					])
				),
			}),
		],
		entry: './src/inject/dom/document.ts',
		output: {
			library: {
				name: 'createClient',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: 'injectDocument.js',
			path: appDist,
		},
	}),*/
	await common('./src/server/tsconfig.json', {
		plugins: [
			new ExcludeProvidePlugin({
				definitions: {
					'Error.captureStackTrace': 'capture-stack-trace',
				},
				exclude: [/capture-stack-trace/],
			}),
		],
		entry: {
			serviceWorker: './src/server/serviceWorker.ts',
		},
		output: {
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	}),
	await common('./src/bootstrapper/tsconfig.json', {
		entry: {
			SearchBuilder: './src/bootstrapper/SearchBuilder.ts',
			Bootstrapper: './src/bootstrapper/Bootstrapper.ts',
		},
		output: {
			library: {
				name: '[name]',
				type: 'umd',
			},
			libraryExport: 'default',
			filename: '[name].js',
			path: appDist,
		},
	}),
];
