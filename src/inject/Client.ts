import GenericCodec from '../Codecs';
import StompURL from '../StompURL';
import { codecType, Config, parseConfig, ParsedConfig } from '../config';
import { CLIENT_KEY } from '../rewriteJS';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../routeURL';
import Module from './Module';
import BareClient from '@tomphttp/bare-client';

export interface ModuleCtor<T> {
	new (client: T): Module<T>;
}

export default class Client {
	modules: Map<ModuleCtor<Client>, Module<any>>;
	bare: BareClient;
	codec: GenericCodec;
	directory: string;
	bareServer: string;
	applied: boolean;
	isDOM: boolean;
	isWorker: boolean;
	/**
	 * The location of the context (or page)
	 * Will always return a URL that can be used to resolve urls
	 */
	get url(): StompURL {
		return this.location;
	}
	/**
	 * The location of the context
	 * May not match the context URL
	 */
	get location(): StompURL {
		if (ROUTE_PROTOCOLS.includes(location.protocol)) {
			return parseRoutedURL(
				location.toString(),
				this.codec,
				`${location.origin}${this.directory}`
			).url;
		} else {
			return new StompURL(
				location.toString(),
				this.codec,
				`${location.origin}${this.directory}`
			);
		}
	}
	constructor(init: ParsedConfig) {
		this.applied = false;
		this.modules = new Map();
		this.codec = init.codec;
		this.directory = init.directory;
		this.bareServer = init.bareServer;
		this.bare = new BareClient(init.bareServer, init.bareClientData);
		this.isDOM = false;
		this.isWorker = false;
	}
	get config(): Config {
		return {
			directory: this.directory,
			codec: codecType(this.codec),
			bareServer: this.bareServer,
			bareClientData: this.bare.data,
		};
	}
	/*
	 called once all modules are created
	 apis can be called, functions can be hooked
	*/
	apply() {
		for (const module of this.modules.values()) {
			if (module.apply) {
				module.apply();
			}
		}

		this.applied = true;
	}
	addModule<T>(Module: ModuleCtor<T>) {
		this.modules.set(
			<ModuleCtor<Client>>(<unknown>Module),
			new Module(<T>(<unknown>this))
		);
	}
	getModule<A extends Client, T extends ModuleCtor<A>>(
		Module: T
	): InstanceType<T> | undefined {
		if (!this.modules.has(<ModuleCtor<Client>>(<unknown>Module))) {
			return undefined;
		}
		return <InstanceType<T>>(
			this.modules.get(<ModuleCtor<Client>>(<unknown>Module))
		);
	}
}

declare global {
	function createClient(config: Config, codecKey: string): void;
}

export function createClientFactory<T>(
	Client: {
		new (init: ParsedConfig): T;
	},
	initClient: (client: T) => void
) {
	return function (config: Config, codecKey: string) {
		delete (global as any).createClient;

		const client = new Client(parseConfig(config, codecKey));

		initClient(client);

		Reflect.defineProperty(global, CLIENT_KEY, {
			value: client,
			configurable: false,
			enumerable: false,
		});
	};
}
