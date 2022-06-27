import StompURL from '../../StompURL';
import { routeXHR } from '../../routeURL';
import DocumentClient from '../DocumentClient';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

export default class NavigatorModule extends Module<DocumentClient> {
	apply() {
		delete (global as any).ServiceWorkerContainer;
		delete (global as any).ServiceWorkerRegistration;

		delete (Navigator.prototype as any).serviceWorker;

		const proxyModule = this.client.getModule(ProxyModule)!;

		Navigator.prototype.sendBeacon = proxyModule.wrapFunction(
			Navigator.prototype.sendBeacon,
			(target, that, args) => {
				args[0] = routeXHR(
					new StompURL(
						new URL(args[0], this.client.url.toString()),
						this.client.url
					)
				);

				return Reflect.apply(target, that, args);
			}
		);
	}
}
