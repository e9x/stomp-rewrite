import { ParsedConfig } from '../config.js';
import baseModules from './baseModules.js';
import { Client, createClientFactory } from './Client.js';

class WorkerClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
	}
}

export default createClientFactory(WorkerClient);
