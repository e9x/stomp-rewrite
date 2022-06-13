import { openDB } from 'idb';

import GenericCodec from './Codecs';
import { Config, generateConfigCodecKey, parseConfig } from './config';
import { parseRoutedURL } from './routeURL';
import StompURL from './StompURL';

interface ServerInit {
	codec: GenericCodec;
	directory: string;
}

export default class Server {
	codec: GenericCodec;
	directory: string;
	constructor(init: ServerInit) {
		if (!init.directory.startsWith('/') || !init.directory.endsWith('/')) {
			throw new Error(
				'init.directory was not an absolute directory (without origin)'
			);
		}

		this.codec = init.codec;
		this.directory = init.directory;
	}
	rewrites: { [key: string]: (url: StompURL) => Response } = {
		js(url: StompURL) {
			return new Response(url.toString(), {
				status: 200,
			});
		},
	};
	willRoute(url: string): boolean {
		const { pathname } = new URL(url);

		if (pathname === `${this.directory}process`) {
			return true;
		}

		for (const rewrite in this.rewrites) {
			if (pathname.startsWith(`${this.directory}${rewrite}/`)) {
				return true;
			}
		}

		return false;
	}
	route(request: Request): Response {
		const url = new URL(request.url);

		if (url.pathname === `${this.directory}process`) {
			return new Response(undefined, {
				headers: {
					refresh: '',
				},
			});
		}

		for (const rewrite in this.rewrites) {
			if (url.pathname.startsWith(`${this.directory}${rewrite}/`)) {
				const callback = this.rewrites[rewrite];

				const parsed = parseRoutedURL(
					url.href,
					this.codec,
					`${url.origin}${this.directory}`
				);

				return callback(parsed.url);
			}
		}

		throw new Error(`${request.url} shouldn't have been routed`);
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
		await store.put(generateConfigCodecKey(config.codec), `codecKey:${config}`);
	}

	const codecKey = await store.get(`codecKey:${config.codec}`);

	await tx.done;

	const init = parseConfig(config, codecKey);

	return new Server(init);
}
