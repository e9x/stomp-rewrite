import Client from '../Client';
import Module from '../Module';
import ProxyModule from './Proxy';

export default class IndexedDBModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		IDBFactory.prototype.open = proxyModule.wrapFunction(
			IDBFactory.prototype.open,
			(target, that, args) => {
				if (typeof args[0] === 'string') {
					args[0] = `${args[0]}@${this.client.url.url.origin}`;
				}

				return Reflect.apply(target, that, args);
			}
		);

		Reflect.defineProperty(IDBDatabase.prototype, 'name', {
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(IDBDatabase.prototype, 'name')!.get!,
				(target, that, args) => {
					return (Reflect.apply(target, that, args) as string).slice(
						this.client.url.url.origin.length
					);
				}
			),
		});
	}
}
