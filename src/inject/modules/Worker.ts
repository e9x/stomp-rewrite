import StompURL, { isUrlLike } from '../../StompURL';
import { routeJS } from '../../rewriteJS';
import Client from '../Client';
import Module from '../Module';
import ProxyModule from './Proxy';

export default class WorkerModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.Worker = proxyModule.wrapFunction(
			global.Worker,
			(target, that, args, newTarget) => {
				if (isUrlLike(args[0])) {
					const isModule =
						typeof args[1] === 'object' &&
						(args[1] as WorkerOptions).type === 'module';

					args[0] = routeJS(
						new StompURL(
							new URL(args[0], this.client.url.toString()),
							this.client.url
						),
						this.client.url,
						this.client.config,
						isModule ? 'workerModule' : 'worker'
					);
				}

				return Reflect.construct(target, args, newTarget);
			},
			true
		);
	}
}
