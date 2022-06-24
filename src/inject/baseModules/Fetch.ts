import StompURL, { urlLike } from '../../StompURL';
import { routeBinary } from '../../routeURL';
import Module from '../Module';
import ProxyModule from './Proxy';
import { BareFetchInit } from '@tomphttp/bare-client';

export default class FetchModule extends Module {
	eventSourceURLs = new WeakMap<EventSource, string>();
	responseURLs = new WeakMap<Response, string>();
	apply() {
		global.EventSource = this.client.getModule(ProxyModule)!.wrapFunction(
			global.EventSource,
			(target, that, args) => {
				const url = new URL(args[0], this.client.url.toString());

				const result = Reflect.construct(
					target,
					[routeBinary(new StompURL(url, this.client.url))],
					that
				);

				this.eventSourceURLs.set(result, url.toString());

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
						if (this.eventSourceURLs.has(that)) {
							return this.eventSourceURLs.get(that);
						} else {
							// eslint-disable-next-line @typescript-eslint/ban-types
							return Reflect.apply(<Function>target, that, args);
						}
					}
				),
		});

		Reflect.defineProperty(global.Response.prototype, 'url', {
			configurable: true,
			enumerable: true,
			get: this.client
				.getModule(ProxyModule)!
				.wrapFunction(
					Reflect.getOwnPropertyDescriptor(global.Response.prototype, 'url')!
						.get!,
					(target, that, args) => {
						if (this.responseURLs.has(that)) {
							return this.responseURLs.get(that);
						} else {
							// eslint-disable-next-line @typescript-eslint/ban-types
							return Reflect.apply(<Function>target, that, args);
						}
					}
				),
		});

		global.Request = this.client.getModule(ProxyModule)!.wrapFunction(
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

		//SUYNCHRONOUSLY REQUEST THE BARE SERVER in XMLHTTPrequest

		global.fetch = this.client
			.getModule(ProxyModule)!
			.wrapFunction(global.fetch, async (_target, _that, args) => {
				let init: BareFetchInit;
				let url: urlLike;

				if (args[0] instanceof Request) {
					url = args[0].url;
					init = <BareFetchInit>args[0];
				} else {
					url = new URL(args[0], this.client.url.toString());
					init = args[1];
				}

				// [input, init]
				//TODO: COOKIES
				const res = await this.client.bare.fetch(url, init);

				// res.url is bad

				const newRes = new Response(res.body, res);

				this.responseURLs.set(newRes, res.finalURL);

				return newRes;
			});
	}
}
