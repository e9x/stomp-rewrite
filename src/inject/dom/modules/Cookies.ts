import { BrowserCookieArray } from '../../../server/Cookies';
import Module from '../../Module';
import ProxyModule, { invokeGlobal } from '../../modules/Proxy';
import DocumentClient from '../Client';
import SyncModule from './Sync';

const cookieDescriptor = Reflect.getOwnPropertyDescriptor(
	Document.prototype,
	'cookie'
)!;

export function getCookie(): string {
	return cookieDescriptor.get!.call(document);
}

export function setCookie(value: string) {
	cookieDescriptor.get!.call(document, value);
}

export class CookiesModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;
		const syncModule = this.client.getModule(SyncModule)!;

		Reflect.defineProperty(Document.prototype, 'cookie', {
			configurable: true,
			enumerable: true,
			get: proxyModule.wrapFunction(cookieDescriptor.get!, (target, that) => {
				invokeGlobal(that, document);
				return new BrowserCookieArray(
					...syncModule.jsonAPI(
						`${this.client.directory}cookies/get`,
						this.client.url.toString()
					)
				).toString();
			}),
			set: proxyModule.wrapFunction(
				cookieDescriptor.set!,
				(target, that, args) => {
					invokeGlobal(that, document);
					const value = String(args[0]);

					syncModule.jsonAPI(
						`${this.client.directory}cookies/set`,
						this.client.url.toString(),
						value
					);
				}
			),
		});
	}
}
