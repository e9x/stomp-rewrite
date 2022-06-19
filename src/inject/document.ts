import { ParsedConfig } from '../config';
import baseModules from './baseModules';
import { Client, createClientFactory } from './Client';

export class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.apply();
	}
}

export default createClientFactory(DocumentClient);
