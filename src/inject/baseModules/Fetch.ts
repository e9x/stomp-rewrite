import StompURL, { urlLike } from '../../StompURL';
import {
	parseRoutedURL,
	routeXHR,
	routeBinary,
	ROUTE_PROTOCOLS,
} from '../../routeURL';
import Client from '../Client';
import Module from '../Module';
import ProxyModule from './Proxy';

export default class FetchModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const eventSourceURLs = new WeakMap<EventSource, string>();
		const responseURLs = new WeakMap<Response, string>();

		global.EventSource = proxyModule.wrapFunction(
			global.EventSource,
			(target, that, args) => {
				const url = new URL(args[0], this.client.url.toString());

				const result = Reflect.construct(
					target,
					[routeBinary(new StompURL(url, this.client.url))],
					that
				);

				eventSourceURLs.set(result, url.toString());

				return result;
			},
			true
		);

		Reflect.defineProperty(global.EventSource.prototype, 'url', {
			configurable: true,
			enumerable: true,
			get: this.client
				.getModule(ProxyModule)!
				.wrapFunction(
					Reflect.getOwnPropertyDescriptor(global.EventSource.prototype, 'url')!
						.get!,
					(target, that, args) => {
						if (eventSourceURLs.has(that)) {
							return eventSourceURLs.get(that);
						} else {
							return Reflect.apply(target, that, args);
						}
					}
				),
		});

		Reflect.defineProperty(global.Response.prototype, 'url', {
			configurable: true,
			enumerable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(global.Response.prototype, 'url')!
					.get!,
				(target, that, args) => {
					if (responseURLs.has(that)) {
						return responseURLs.get(that);
					} else {
						// eslint-disable-next-line @typescript-eslint/ban-types
						return Reflect.apply(<Function>target, that, args);
					}
				}
			),
		});

		global.Request = proxyModule.wrapFunction(
			global.Request,
			(target, _that, args, newTarget) => {
				if (args.length === 0) {
					throw new DOMException(
						"Failed to construct 'Request': 1 argument required, but only 0 present.'"
					);
				}

				return Reflect.construct(
					target,
					[new URL(args[0], this.client.url.toString()), args[1]],
					newTarget
				);
			},
			true
		);

		global.fetch = proxyModule.wrapFunction(
			global.fetch,
			async (_target, _that, args) => {
				let init: RequestInit;
				let url: urlLike;

				if (args[0] instanceof Request) {
					url = new URL(args[0].url);
					init = args[0];
				} else {
					url = new URL(args[0], this.client.url.toString());
					init = args[1];
				}

				if (!ROUTE_PROTOCOLS.includes(url.protocol)) {
					return await fetch(url, init);
				}

				// [input, init]
				//TODO: COOKIES
				const res = await fetch(
					routeXHR(new StompURL(url, this.client.url)),
					init
				);

				responseURLs.set(
					res,
					parseRoutedURL(
						res.url,
						this.client.codec,
						`${location.origin}${this.client.directory}`
					).url.toString()
				);

				return res;
			}
		);
	}
}
