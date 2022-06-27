import { CLIENT_KEY } from '../../rewriteJS';
import { injectDocumentJS } from '../../routeURL';
import Client from '../Client';
import DocumentClient from '../DocumentClient';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

export default class IFrameModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		/*createClient(${JSON.stringify(
		config
	)}, ${JSON.stringify(url.codec.key)});*/

		function injectContext(this: IFrameModule, context: typeof global) {
			if (CLIENT_KEY in context) return;

			const http = new XMLHttpRequest();
			http.open('GET', injectDocumentJS(this.client.url), false);
			http.send();
			new context.Function(http.responseText!)();

			context.createClient(this.client.config, this.client.codec.key);

			((context as any)[CLIENT_KEY] as Client).apply();
		}

		const getContentWindow = Reflect.getOwnPropertyDescriptor(
			HTMLIFrameElement.prototype,
			'contentWindow'
		)!.get!;

		for (const ctxCursor of ['contentWindow', 'contentDocument']) {
			Reflect.defineProperty(HTMLIFrameElement.prototype, ctxCursor, {
				configurable: true,
				enumerable: true,
				get: proxyModule.wrapFunction(
					Reflect.getOwnPropertyDescriptor(
						HTMLIFrameElement.prototype,
						ctxCursor
					)!.get!,
					(target, that, args) => {
						const result = Reflect.apply(target, that, args);
						const context = getContentWindow.call(that);
						if (context) {
							injectContext.call(this, <typeof global>(<unknown>context));
						}
						return result;
					}
				),
			});
		}
	}
}
