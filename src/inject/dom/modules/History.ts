import StompURL, { isUrlLike } from '../../../StompURL';
import { routeHTML } from '../../../rewriteHTML';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import DocumentClient from '../Client';

export default class HistoryModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		function updateState(
			this: HistoryModule,
			target: typeof history.pushState,
			that: History,
			args: any[]
		) {
			if (isUrlLike(args[2])) {
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
