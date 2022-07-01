import { Config } from '../config';
import Router from './Router';
import createServer from './createServer';

const config: Config = JSON.parse(
	new URLSearchParams(location.search).get('config')!
);

let server: Router | undefined;

createServer(config).then((s) => (server = s));

self.addEventListener('fetch', (event: FetchEvent) => {
	if (!server) return;

	if (server.willRoute(event.request.url)) {
		event.respondWith(server.route(event.request));
	}
});
