import StompURL from '../../StompURL';
import { routeHTML } from '../../rewriteHTML';
import Module from '../Module';
import { setGlobalProxy } from '../baseModules/Access';
import ProxyModule from '../baseModules/Proxy';

/**
{
	assign: {
		value: 'function assign() {\n    [native code]\n}',
		writable: false,
		enumerable: true,
		configurable: false,
	},
	replace: {
		value: 'function replace() {\n    [native code]\n}',
		writable: false,
		enumerable: true,
		configurable: false,
	},
	reload: {
		value: 'function reload() {\n    [native code]\n}',
		writable: false,
		enumerable: true,
		configurable: false,
	},
	toString: {
		value: 'function toString() {\n    [native code]\n}',
		writable: false,
		enumerable: true,
		configurable: false,
	},
	valueOf: {
		value: 'function valueOf() {\n    [native code]\n}',
		writable: false,
		enumerable: false,
		configurable: false,
	},
}
 */

export default class LocationModule extends Module {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const proxy = {};

		// all getters/setters
		for (const common of [
			'href',
			'origin',
			'protocol',
			'host',
			'hostname',
			'port',
			'pathname',
			'search',
			'hash',
		]) {
			const urlDescriptor = Reflect.getOwnPropertyDescriptor(
				URL.prototype,
				common
			)!;

			const locationDescriptor = Reflect.getOwnPropertyDescriptor(
				location,
				common
			)!;

			Reflect.defineProperty(proxy, common, {
				...locationDescriptor,
				get: locationDescriptor.get
					? proxyModule?.wrapFunction(
							locationDescriptor.get,
							(target, that, args) => {
								if (common === 'hash') {
									return Reflect.apply(target, location, args);
								}

								const temp = new URL(this.client.url.toString());

								return Reflect.apply(urlDescriptor.get!, temp, args);
							}
					  )
					: undefined,
				set: locationDescriptor.set
					? proxyModule?.wrapFunction(
							locationDescriptor.set,
							(target, that, args) => {
								if (common === 'hash') {
									return Reflect.apply(target, location, args);
								}

								const temp = new URL(this.client.url.toString());

								Reflect.apply(urlDescriptor.set!, temp, args);

								location.href = routeHTML(
									new StompURL(temp, this.client.url),
									this.client.url,
									this.client.config
								);
							}
					  )
					: undefined,
			});
		}

		Reflect.defineProperty(proxy, 'assign', {
			value: proxyModule.wrapFunction(
				location.assign,
				(target, that, [url]) => {
					return Reflect.apply(target, location, [
						routeHTML(
							new StompURL(
								new URL(url, this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config
						),
					]);
				}
			),
			writable: false,
			enumerable: true,
			configurable: false,
		});

		Reflect.setPrototypeOf(proxy, Location.prototype);

		setGlobalProxy(location, 'location', proxy);
	}
}
