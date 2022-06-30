import { Config } from '../config';
import Router from './Router';
import createServer from './createServer';

const config: Config = JSON.parse(
	new URLSearchParams(location.search).get('config')!
);

let server: Router | undefined;

createServer(config).then(s => (server = s));

declare global {
	type FetchEvent = Event & {
		request: Request;
		respondWith: (response: Promise<Response>) => void;
	};
	interface WindowEventMap {
		fetch: FetchEvent;
	}
}

self.addEventListener('fetch', event => {
	if (!server) return;

	if (server.willRoute(event.request.url)) {
		event.respondWith(server.route(event.request));
	}
});
