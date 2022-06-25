import StompURL from '../../StompURL';
import { routeBeacon } from '../../routeURL';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

export default class NavigatorModule extends Module {
	apply() {
		delete (global as any).ServiceWorkerContainer;
		delete (global as any).ServiceWorkerRegistration;

		delete (Navigator.prototype as any).serviceWorker;

		const proxyModule = this.client.getModule(ProxyModule)!;

		Navigator.prototype.sendBeacon = proxyModule.wrapFunction(
			Navigator.prototype.sendBeacon,
			(target, that, args) => {
				args[0] = routeBeacon(
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
