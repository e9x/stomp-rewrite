import GenericCodec from '../Codecs';
import StompURL from '../StompURL';
import { codecType, Config, parseConfig, ParsedConfig } from '../config';
import { CLIENT_KEY } from '../rewriteJS';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../routeURL';
import Module from './Module';
import BareClient from '@tomphttp/bare-client';

export interface ModuleCtor {
	new (client: any): Module<any>;
}

export default class Client {
	modules: Map<ModuleCtor, Module<any>>;
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
	addModule(Module: ModuleCtor) {
		this.modules.set(Module, new Module(this));
	}
	getModule<T extends ModuleCtor>(Module: T): InstanceType<T> | undefined {
		if (!this.modules.has(Module)) {
			return undefined;
		}
		return <InstanceType<T>>this.modules.get(Module);
	}
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
