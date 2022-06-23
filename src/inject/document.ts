import { ParsedConfig } from '../config';
import baseModules from './baseModules';
import { Client, createClientFactory } from './Client';
import LocationModule from './documentModules/Location';

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.addModule(LocationModule);
	}
}

export default createClientFactory(DocumentClient);
