import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { resolve } from 'path';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

export default [
	...[
		[
			'dist/injectWorker.js',
			'src/inject/worker/worker.ts',
			'src/inject/worker/tsconfig.json',
			{},
		],
		[
			'dist/injectDocument.js',
			'src/inject/dom/document.ts',
			'src/inject/dom/tsconfig.json',
			{
				...Object.fromEntries(
					['DOMParser', 'navigator', 'postMessage'].map((name) => [
						name,
						[resolve('src/inject/dom/snapshot.ts'), name],
					])
				),
			},
		],
	].map(([file, input, tsconfig, additionalInject]) => ({
		input,
		output: {
			file,
			format: 'umd',
			name: 'createClient',
			exports: 'default',
			sourcemap: true,
			intro: 'const global = globalThis;',
		},
		plugins: [
			typescript({
				tsconfig,
			}),
			inject({
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
					].map((name) => [name, [resolve('src/inject/snapshot.ts'), name]])
				),
				...additionalInject,
				exclude: /\.json$/,
			}),
			nodeResolve({ browser: true }),
			commonjs({
				include: /node_modules/,
			}),
			babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
			terser(),
			json(),
			sourcemaps(),
		],
	})),
	{
		input: './src/server/serviceWorker.ts',
		output: {
			file: `dist/serviceWorker.js`,
			sourcemap: true,
			intro: 'const global = globalThis;',
		},
		plugins: [
			typescript({
				tsconfig: './src/server/tsconfig.json',
			}),
			nodeResolve({ browser: true }),
			commonjs({
				include: /node_modules/,
			}),
			babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
			terser(),
			json(),
			sourcemaps(),
		],
	},
	...[
		[
			'src/bootstrapper/Bootstrapper.ts',
			'dist/Bootstrapper.js',
			'StompBootstrapper',
		],
		[
			'src/bootstrapper/SearchBuilder.ts',
			'dist/SearchBuilder.js',
			'SearchBuilder',
		],
	].map(([input, outputFile, outputName]) => ({
		input,
		output: {
			file: outputFile,
			format: 'umd',
			name: outputName,
			exports: 'default',
			sourcemap: true,
			intro: 'const global = globalThis;',
		},
		plugins: [
			typescript({
				tsconfig: './src/bootstrapper/tsconfig.json',
			}),
			inject({
				'Error.captureStackTrace': 'capture-stack-trace',
				// exclude: [/capture-stack-trace/],
			}),
			babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
			terser(),
			sourcemaps(),
		],
	})),
];
