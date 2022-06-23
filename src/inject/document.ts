import { ParsedConfig } from '../config';
import baseModules from './baseModules';
import { Client, createClientFactory } from './Client';

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
	}
}

export default createClientFactory(DocumentClient);
