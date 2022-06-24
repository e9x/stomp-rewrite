import { ParsedConfig } from '../config';
import Client, { createClientFactory } from './Client';
import baseModules from './baseModules';
import DOMModule from './documentModules/DOM';
import { DOMHooksModule } from './documentModules/DOMHooks';
import HistoryModule from './documentModules/History';
import LocationModule from './documentModules/Location';
import NavigatorModule from './documentModules/Navigator';

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.addModule(HistoryModule);
		this.addModule(NavigatorModule);
		this.addModule(LocationModule);
		this.addModule(DOMHooksModule);
		this.addModule(DOMModule);
	}
	loadHTML(html: string) {
		console.log('got html', html);
	}
}

export default createClientFactory(DocumentClient);
