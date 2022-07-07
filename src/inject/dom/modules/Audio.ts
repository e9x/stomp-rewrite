import StompURL from '../../../StompURL';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import DocumentClient from '../Client';

export default class AudioModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.Audio = proxyModule.wrapFunction(
			global.Audio,
			(target, that, args, newTarget) => {
				if (args[0] !== undefined)
					args[0] = routeBinary(
						new StompURL(
							new URL(args[0], this.client.url.toString()),
							this.client.url
						)
					);

				return Reflect.construct(target, args, newTarget);
			},
			true
		);
	}
}
