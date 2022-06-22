import BareClient from '@tomphttp/bare-client';

import GenericCodec from '../Codecs.js';
import { Config, parseConfig, ParsedConfig } from '../config.js';
import { CLIENT_KEY } from '../rewriteJS.js';
import StompURL from '../StompURL.js';
import Module from './Module.js';

export interface ModuleCtor {
	new (client: Client): Module;
}

export class Client {
	modules: Map<ModuleCtor, Module>;
	bare: BareClient;
	codec: GenericCodec;
	directory: string;
	private location: Location = global.location;
	get url() {
		return new StompURL(this.location.toString(), this.codec, this.directory);
	}
	constructor(init: ParsedConfig) {
		this.modules = new Map();
		this.codec = init.codec;
		this.directory = init.directory;
		this.bare = new BareClient(init.bareServer, init.bareClientData);
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

export function createClientFactory(Client: {
	new (init: ParsedConfig): Client;
}) {
	return function (config: Config, codecKey: string) {
		Reflect.defineProperty(global, CLIENT_KEY, {
			value: new Client(parseConfig(config, codecKey)),
			configurable: false,
			enumerable: false,
		});
	};
}
