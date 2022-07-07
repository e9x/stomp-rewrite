import Module from '../../Module';
import ProxyModule, {
	catchRequiredArguments,
	contextThis,
	newConstructor,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient from '../Client';
import SyncModule from './Sync';

export default class StorageModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;
		const syncModule = this.client.getModule(SyncModule)!;

		const instances = new WeakSet();

		let building = true;

		const getOrigin = () => this.client.url.url.origin;

		const storageKeys = (directory: string): string[] => {
			return syncModule.jsonAPI(
				`${directory}getKeys`,
				this.client.url.url.origin
			);
		};

		class StorageProxy {
			#directory: string;
			constructor(directory: string) {
				if (!building) {
					throw new TypeError(`Illegal constructor`);
				}

				this.#directory = directory;
			}
			clear(): void {
				syncModule.jsonAPI(`${this.#directory}clear`);
			}
			getItem(...args: [unknown]): string | null {
				catchRequiredArguments(args.length, 1, 'Storage', 'getItem');

				const key = String(args[0]);

				const result: null | string = syncModule.jsonAPI(
					`${this.#directory}getItem`,
					getOrigin(),
					String(key)
				);

				return result;
			}
			key(...args: [unknown]): string | null {
				catchRequiredArguments(args.length, 1, 'Storage', 'key');

				const index = Number(args[0]);

				const result: string[] = syncModule.jsonAPI(
					`${this.#directory}getKeys`,
					getOrigin()
				);

				return index >= result.length ? null : result[index];
			}
			get length(): number {
				const result: string[] = syncModule.jsonAPI(
					`${this.#directory}getKeys`,
					getOrigin()
				);

				return result.length;
			}
			removeItem(...args: [unknown]): void {
				catchRequiredArguments(args.length, 1, 'Storage', 'removeItem');

				const item = String(args[0]);

				syncModule.jsonAPI(`${this.#directory}removeItem`, getOrigin(), item);
			}
			setItem(...args: [unknown, unknown]): void {
				catchRequiredArguments(args.length, 2, 'Storage', 'setItem');

				const item = String(args[0]);
				const value = String(args[1]);

				syncModule.jsonAPI(
					`${this.#directory}setItem`,
					getOrigin(),
					item,
					value
				);
			}
		}

		const globalStorageProxy = newConstructor(StorageProxy);

		const natives = new WeakMap<object, StorageProxy>();

		proxyModule.bindNatives(globalStorageProxy.prototype, natives);
		proxyModule.mirrorClass(Storage, globalStorageProxy, instances);

		function isStorageKey(
			target: StorageProxy,
			prop: string | symbol
		): prop is string {
			if (typeof prop === 'symbol') {
				return false;
			}

			const stack: object[] = [target];

			while (true) {
				const object = stack.pop();

				if (!object) {
					return true;
				}

				if (Reflect.getOwnPropertyDescriptor(object, prop)) {
					return false;
				}

				const prototype = Reflect.getPrototypeOf(object);

				if (prototype) {
					stack.push(prototype);
				}
			}
		}

		const storageFactory = (directory: string) => {
			const storage = new StorageProxy(directory);
			const proxy = new Proxy(storage, {
				get: (target, prop, receiver) => {
					if (!isStorageKey(target, prop)) {
						return Reflect.get(target, prop, receiver);
					}

					return usePrototype(storage, StorageProxy.prototype, (storage) => {
						const item = storage.getItem(prop);

						return item === null ? undefined : item;
					});
				},
				set: (target, prop, value) => {
					if (!isStorageKey(target, prop)) {
						return Reflect.set(target, prop, value);
					}

					return usePrototype(storage, StorageProxy.prototype, (storage) => {
						storage.setItem(prop, value);
						return true;
					});
				},
				getOwnPropertyDescriptor: (target, prop) => {
					if (!isStorageKey(target, prop)) {
						return Reflect.getOwnPropertyDescriptor(target, prop);
					}

					return usePrototype(storage, StorageProxy.prototype, (storage) => {
						const value = storage.getItem(prop);

						if (value === null) return undefined;

						return {
							value,
							writable: true,
							enumerable: true,
							configurable: true,
						};
					});
				},
				deleteProperty: (target, prop) => {
					if (!isStorageKey(target, prop)) {
						return Reflect.deleteProperty(target, prop);
					}

					return usePrototype(storage, StorageProxy.prototype, (storage) => {
						storage.removeItem(prop);

						return true;
					});
				},
				has: (target, prop) => {
					if (!isStorageKey(target, prop)) {
						return Reflect.has(target, prop);
					}

					return storageKeys(directory).includes(prop);
				},
				ownKeys: (target) => {
					const ownKeys = Reflect.ownKeys(target);

					// almost EXACTLY how ownKeys works on Storage instances
					return [...ownKeys, ...storageKeys(directory)];
				},
			});

			instances.add(storage);
			instances.add(proxy);
			natives.set(proxy, storage);

			return proxy;
		};

		const localStorage = storageFactory(
			`${this.client.directory}localStorage/`
		);
		const sessionStorage = storageFactory(
			`${this.client.directory}sessionStorage/`
		);

		building = false;

		// constructor becomes equivalent to constructor() when building = false
		global.Storage = <{ new (): StorageProxy }>globalStorageProxy;

		Reflect.defineProperty(global, 'localStorage', {
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(global, 'sessionStorage')!.get!,
				(target, that) => {
					if (contextThis(that) !== global) {
						throw new TypeError('Illegal invocation');
					}

					return localStorage;
				}
			),
			enumerable: true,
			configurable: true,
		});

		Reflect.defineProperty(global, 'sessionStorage', {
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(global, 'sessionStorage')!.get!,
				(target, that) => {
					if (contextThis(that) !== global) {
						throw new TypeError('Illegal invocation');
					}

					return sessionStorage;
				}
			),
			enumerable: true,
			configurable: true,
		});
	}
}
