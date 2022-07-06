import StompURL from '../../../StompURL';
import { routeHTML } from '../../../rewriteHTML';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import DocumentClient from '../Client';

const anchorHrefDescriptor = Reflect.getOwnPropertyDescriptor(
	HTMLAnchorElement.prototype,
	'href'
)!;

export default class AnchorModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		// both HTMLAnchorElement.prototype and location share these descriptors
		for (const common of [
			'origin',
			'protocol',
			'username',
			'password',
			'host',
			'hostname',
			'port',
			'pathname',
			'search',
			'hash',
			// DOM hook takes care of this
			// 'href',
		]) {
			const urlDescriptor = Reflect.getOwnPropertyDescriptor(
				URL.prototype,
				common
			);

			const anchorDescriptor = Reflect.getOwnPropertyDescriptor(
				HTMLAnchorElement.prototype,
				common
			);

			if (!urlDescriptor || !anchorDescriptor) {
				console.error(
					`Common property ${common} was missing on URL.prototype/HTMLAnchorElement.prototype`
				);
				continue;
			}

			Reflect.defineProperty(HTMLAnchorElement.prototype, common, {
				...anchorDescriptor,
				get: anchorDescriptor.get
					? proxyModule?.wrapFunction(
							anchorDescriptor.get,
							(target, that, args) => {
								if (common === 'hash') {
									return Reflect.apply(target, location, args);
								}

								const temp = new URL(this.client.location.toString());

								return Reflect.apply(urlDescriptor.get!, temp, args);
							}
					  )
					: undefined,
				set: anchorDescriptor.set
					? proxyModule?.wrapFunction(
							anchorDescriptor.set,
							(target, that, args) => {
								if (common === 'hash') {
									return Reflect.apply(target, location, args);
								}

								const temp = new URL(this.client.location.toString());

								if (common === 'href') {
									args[0] = new URL(args[0], this.client.url.toString());
								}

								Reflect.apply(urlDescriptor.set!, temp, args);

								Reflect.apply(anchorHrefDescriptor!.set!, that, [
									routeHTML(
										new StompURL(temp, this.client.url),
										this.client.url,
										this.client.config
									),
								]);
							}
					  )
					: undefined,
			});
		}
	}
}
