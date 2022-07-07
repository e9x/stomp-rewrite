import StompURL from '../../StompURL';
import { routeJS } from '../../rewriteJS';
import Client from '../Client';
import Module from '../Module';
import ProxyModule, { catchRequiredArguments } from './Proxy';

export default class WorkerModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.Worker = proxyModule.wrapFunction(
			global.Worker,
			(target, that, args, newTarget) => {
				if (!newTarget) {
					throw new TypeError(
						`Failed to construct 'Worker': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`
					);
				}

				catchRequiredArguments(args.length, 1, 'Worker', 'constructor');

				const isModule =
					typeof args[1] === 'object' &&
					(args[1] as WorkerOptions).type === 'module';

				args[0] = routeJS(
					new StompURL(
						new URL(String(args[0]), this.client.url.toString()),
						this.client.url
					),
					this.client.url,
					this.client.config,
					isModule ? 'workerModule' : 'worker'
				);

				return Reflect.construct(target, args, newTarget);
			},
			true
		);
	}
}
