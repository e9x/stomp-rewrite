import babel from '@rollup/plugin-babel';
import inject from '@rollup/plugin-inject';
import { resolve } from 'path';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

export default [
	...[
		['injectWorker', './src/inject/worker.ts', 'default'],
		['injectDocument', './src/inject/document.ts', 'default'],
		['serviceWorker', './src/server/serviceWorker.ts', 'none'],
	]
		.map(([name, input, exports]) => ({
			input,
			output: {
				file: `dist/${name}.js`,
				format: 'umd',
				name: 'createClient',
				exports,
			},
			plugins: [
				inject(
					Object.fromEntries(
						[
							'fetch',
							'Request',
							'Response',
							'WebSocket',
							'XMLHttpRequest',
							'URL',
							'Reflect',
							'EventSource',
						].map((name) => [resolve('src/inject/snapshot.ts'), name])
					)
				),
				typescript(),
				babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
				terser(),
				commonjs(),
				json(),
				nodeResolve(),
			],
		})),
	{
		input: 'src/bootstrapper/Bootstrapper.ts',
		output: {
			file: 'dist/Bootstrapper.js',
			format: 'umd',
			name: 'StompBootstrapper',
			exports: 'default',
		},
		plugins: [
			typescript(),
			babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
			terser(),
		],
	},
	{
		input: 'src/bootstrapper/SearchBuilder.ts',
		output: {
			file: 'dist/SearchBuilder.js',
			format: 'umd',
			name: 'SearchBuilder',
			exports: 'default',
		},
		plugins: [
			typescript(),
			babel({ babelHelpers: 'bundled', extensions: ['.ts'] }),
			terser(),
		],
	},
];
