import { Config } from '../config.js';
import Server, { createServer } from './Server.js';

const config: Config = JSON.parse(
	new URLSearchParams(location.search).get('config')!
);

let server: Server | undefined;

createServer(config).then((s) => (server = s));

declare global {
	type FetchEvent = Event & {
		request: Request;
		respondWith: (response: Promise<Response>) => void;
	};
	interface WindowEventMap {
		fetch: FetchEvent;
	}
}

self.addEventListener('fetch', (event) => {
	if (!server) return;

	if (server.willRoute(event.request.url)) {
		event.respondWith(server.route(event.request));
	}
});
