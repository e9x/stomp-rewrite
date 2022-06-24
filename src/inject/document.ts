import { ParsedConfig } from '../config';
import Client, { createClientFactory } from './Client';
import baseModules from './baseModules';
import DOMModule from './documentModules/DOM';
import { DOMHooksModule } from './documentModules/DOMHooks';
import LocationModule from './documentModules/Location';

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.addModule(LocationModule);
		this.addModule(DOMHooksModule);
		this.addModule(DOMModule);
	}
}

export default createClientFactory(DocumentClient);
