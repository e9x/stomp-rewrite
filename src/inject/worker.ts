import { ParsedConfig } from '../config';
import Client, { createClientFactory } from './Client';
import baseModules from './baseModules';

class WorkerClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
	}
}

export default createClientFactory(WorkerClient);
