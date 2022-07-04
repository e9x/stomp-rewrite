import StompURL, { isUrlLike } from '../../../StompURL';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import ProxyModule from '../../modules/Proxy';
import DocumentClient from '../Client';

export default class ImageModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		global.Image = proxyModule.wrapFunction(
			global.Image,
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
