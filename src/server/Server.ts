import BareClient from 'bare-client';
import createHttpError from 'http-errors';
import { openDB } from 'idb';

import GenericCodec from '../Codecs.js';
import {
	Config,
	ParsedConfig,
	generateConfigCodecKey,
	parseConfig,
} from '../config.js';
import { parseRoutedURL } from '../routeURL.js';
import StompURL from '../StompURL.js';
import process from './process.js';
import rewrites from './rewrites.js';

function json(status: number, data: object | number | string): Response {
	return new Response(JSON.stringify(data, null, '\t'), {
		status,
		headers: {
			'content-type': 'application/json',
		},
	});
}

export default class Server {
	codec: GenericCodec;
	directory: string;
	bare: BareClient;
	constructor(init: ParsedConfig) {
		if (!init.directory.startsWith('/') || !init.directory.endsWith('/')) {
			throw new Error(
				'init.directory was not an absolute directory (without origin)'
			);
		}

		this.codec = init.codec;
		this.directory = init.directory;
		this.bare = new BareClient(init.bareServer);
	}
	willRoute(url: string): boolean {
		const { pathname } = new URL(url);

		if (pathname === `${this.directory}process`) {
			return true;
		}

		for (const rewrite in rewrites) {
			if (pathname.startsWith(`${this.directory}${rewrite}/`)) {
				return true;
			}
		}

		return false;
	}
	async tryRoute(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === `${this.directory}process`) {
			const params = new URLSearchParams(await request.text());

			if (!params.has('url')) {
				throw new Error('Missing URL param');
			}

			return await process(
				new StompURL(params.get('url')!, this.codec, this.directory)
			);
		}

		for (const rewrite in rewrites) {
			if (url.pathname.startsWith(`${this.directory}${rewrite}/`)) {
				const callback = rewrites[rewrite];

				const parsed = parseRoutedURL(
					url.href,
					this.codec,
					`${url.origin}${this.directory}`
				);

				return await callback(parsed.url, request, this.bare);
			}
		}

		throw new Error(`${request.url} shouldn't have been routed`);
	}
	async route(request: Request): Promise<Response> {
		try {
			return await this.tryRoute(request);
		} catch (error) {
			let httpError;
			let id;

			if (createHttpError.isHttpError(error)) {
				httpError = error;
			} else {
				if (error instanceof Error) {
					httpError = new createHttpError.InternalServerError(error.message);
					httpError.stack = error.stack;
					id = error.name;
				} else {
					httpError = new createHttpError.InternalServerError(String(error));
					id = 'UNKNOWN';
				}
			}

			if (request.destination === 'document') {
				return new Response(
					`<!DOCTYPE HTML>
<html>
<head>
<meta charset='utf-8' />
<title>Error</title>
</head>
<body>
<h1>An error occurred. (${httpError.status})</h1>
<hr />
<p>Code: <span id='errname'></span></p>
<p>ID: <span id='errid'></span></p>
<p>Message: <span id='errmessage'></span></p>
<p>Stack trace:</p>
<pre id='errstack'></pre>
<script>
const name = ${JSON.stringify(httpError.name)};
const stack = ${JSON.stringify(httpError.stack)};
const message = ${JSON.stringify(httpError.message)};
const id = ${JSON.stringify(id)};

errname.textContent = name;
errmessage.textContent = message;
errstack.textContent = stack;
errid.textContent = id;

const error = new Error(message);
error.name = name;
error.stack = stack;
console.error(error);
</script>
</body>
</html>`,
					{
						status: httpError.status,
						headers: {
							'content-type': 'text/html',
						},
					}
				);
			} else {
				return json(httpError.status, {
					message: httpError.message,
					status: httpError.status,
				});
			}
		}
	}
}

export async function createServer(config: Config) {
	const db = await openDB('stomp', 1, {
		upgrade(db) {
			db.createObjectStore('consts');
		},
	});

	const tx = db.transaction('consts', 'readwrite');
	const store = tx.objectStore('consts');

	if (!(await store.get(`codecKey:${config.codec}`))) {
		await store.put(
			generateConfigCodecKey(config.codec),
			`codecKey:${config.codec}`
		);
	}

	const codecKey = await store.get(`codecKey:${config.codec}`);

	await tx.done;

	const init = parseConfig(config, codecKey);

	return new Server(init);
}
