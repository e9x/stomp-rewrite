import StompURL, { isUrlLike } from '../../../StompURL';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import Client from '../Client';

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
