import { Config, generateConfigCodecKey, parseConfig } from '../config';
import { registerCookies } from './Cookies';
import Router from './Router';
import { registerStorage } from './Storage';
import { registerXhr } from './Sync';
import { registerRewrites } from './rewrites';
import { openDB } from 'idb';

export default async function createServer(config: Config): Promise<Router> {
	const db = await openDB('stompConfig', 1, {
		upgrade: (db) => {
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

	const router = new Router(init.directory);

	const cookies = await registerCookies(router);
	registerRewrites(router, init, cookies);
	await registerStorage(router);
	registerXhr(router);

	return router;
}
