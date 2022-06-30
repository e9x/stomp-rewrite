import StompURL, { isUrlLike } from '../../../StompURL';
import { routeJS } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import WorkerClient from '../Client';

export default class ImportScriptsModule extends Module<WorkerClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.importScripts = proxyModule.wrapFunction(
			global.importScripts,
			(target, that, args) => {
				for (let i = 0; i < args.length; i++)
					if (isUrlLike(args[i]))
						args[i] = routeJS(
							new StompURL(
								new URL(args[1], this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config,
							'generic'
						);

				return Reflect.apply(target, that, args);
			}
		);
	}
}
