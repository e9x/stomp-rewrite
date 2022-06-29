import StompURL, { isUrlLike } from '../../StompURL';
import { routeJS } from '../../rewriteJS';
import { routeBinary } from '../../routeURL';
import Client from '../Client';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

export default class AudioModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.Audio = proxyModule.wrapFunction(
			global.Audio,
			(target, that, args, newTarget) => {
				if (isUrlLike(args[0])) {
					args[0] = routeBinary(
						new StompURL(
							new URL(args[0], this.client.url.toString()),
							this.client.url
						)
					);
				}

				return Reflect.construct(target, args, newTarget);
			},
			true
		);
	}
}
