import ExcludeProvidePlugin from './ExcludeProvidePlugin.js';
import { resolve } from 'path';
import { cwd, env } from 'process';
import ResolveTypescriptPlugin from 'resolve-typescript-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';

const isEnvDevelopment = env.NODE_ENV === 'development';
const isEnvProduction = env.NODE_ENV === 'production';

/**
 * @param {import('webpack').Configuration & {tsConfig:string}} config
 * @returns {import('webpack').Configuration}
 */
const common = (config) => ({
	entry: config.entry,
	output: {
		...config.output,
		path: resolve(cwd(), 'dist'),
	},
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
						configFile: resolve(cwd(), config.tsConfig),
					},
				},
			},
			{
				test: /\.(ts|js)x?$/,
				enforce: 'pre',
				use: {
					options: {
						eslintPath: 'eslint',
					},
					loader: 'eslint-loader',
				},
				exclude: /node_modules/,
			},
			{
				test: /\.js$/,
				enforce: 'pre',
				use: 'source-map-loader',
			},
		],
	},
	ignoreWarnings: [/Failed to parse source map/],
	resolve: {
		extensions: ['.ts', '.js'],
		plugins: [new ResolveTypescriptPlugin()],
	},
	optimization: {
		minimize: isEnvProduction,
		minimizer: [new TerserPlugin()],
	},
	plugins: [...(config.plugins || [])].filter(Boolean),
});

/**
 * @type {import('webpack').Configuration[]}
 */
export default [
	...[
		[
			'./src/inject/worker/tsconfig.json',
			'./src/inject/worker/worker.ts',
			'injectWorker.js',
			{},
		],
		[
			'./src/inject/dom/tsconfig.json',
			'./src/inject/dom/document.ts',
			'injectDocument.js',
			Object.fromEntries(
				['DOMParser', 'navigator', 'postMessage'].map((name) => [
					name,
					[resolve(cwd(), './src/inject/dom/snapshot.ts'), name],
				])
			),
		],
	].map(([tsConfig, entry, filename, additionalInjecions]) =>
		common({
			tsConfig,
			entry,
			output: {
				library: {
					name: 'createClient',
					type: 'umd',
				},
				libraryExport: 'default',
				filename,
			},
			plugins: [
				new webpack.ProvidePlugin({
					...Object.fromEntries(
						[
							'fetch',
							'Request',
							'Response',
							'WebSocket',
							'XMLHttpRequest',
							'URL',
							'Reflect',
							'EventSource',
							'Function',
							'AsyncFunction',
						].map((name) => [
							name,
							[resolve(cwd(), './src/inject/snapshot.ts'), name],
						])
					),
					...additionalInjecions,
				}),
			],
		})
	),
	common({
		tsConfig: './src/server/tsconfig.json',
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
		},
	}),
	...[
		[
			'SearchBuilder',
			'SearchBuilder.js',
			'./src/bootstrapper/SearchBuilder.ts',
		],
		[
			'StompBootstrapper',
			'Bootstrapper.js',
			'./src/bootstrapper/Bootstrapper.ts',
		],
	].map(([name, filename, entry]) =>
		common({
			tsConfig: './src/bootstrapper/tsconfig.json',
			entry,
			output: {
				library: {
					name,
					type: 'umd',
				},
				libraryExport: 'default',
				filename,
			},
		})
	),
];
