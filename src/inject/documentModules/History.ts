import StompURL from '../../StompURL';
import { routeHTML } from '../../rewriteHTML';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

export default class HistoryModule extends Module {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		function updateState(
			this: HistoryModule,
			target: typeof history.pushState,
			that: History,
			args: any[]
		) {
			if (typeof args[2] === 'string' || args[2] instanceof URL) {
				args[2] = routeHTML(
					new StompURL(
						new URL(args[2], this.client.url.toString()),
						this.client.url
					),
					this.client.url,
					this.client.config
				);
			}

			return Reflect.apply(target, that, args);
		}

		History.prototype.pushState = proxyModule.wrapFunction(
			History.prototype.pushState,
			updateState.bind(this)
		);

		History.prototype.replaceState = proxyModule.wrapFunction(
			History.prototype.replaceState,
			updateState.bind(this)
		);
	}
}
