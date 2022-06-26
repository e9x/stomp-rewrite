import StompURL from '../StompURL';
import { ParsedConfig } from '../config';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../routeURL';
import Client, { createClientFactory } from './Client';
import baseModules from './baseModules';
import cloneRawNode, { parseHTML } from './cloneNode';
import DOMModule from './documentModules/DOM';
import { DOMHooksModule } from './documentModules/DOMHooks';
import HistoryModule from './documentModules/History';
import IFrameModule from './documentModules/IFrame';
import LocationModule from './documentModules/Location';
import NavigatorModule from './documentModules/Navigator';
import SyncModule from './documentModules/Sync';
import { decode } from 'entities';

const getBaseURI = Reflect.getOwnPropertyDescriptor(
	Node.prototype,
	'baseURI'
)!.get!.bind(document);

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.addModule(HistoryModule);
		this.addModule(NavigatorModule);
		this.addModule(LocationModule);
		this.addModule(DOMHooksModule);
		this.addModule(DOMModule);
		this.addModule(IFrameModule);
		this.addModule(SyncModule);
	}
	get url(): StompURL {
		if (ROUTE_PROTOCOLS.includes(this.baseURI.protocol)) {
			return parseRoutedURL(
				this.baseURI.href,
				this.codec,
				`${this.baseURI.origin}${this.directory}`
			).url;
		} else {
			return new StompURL(
				this.baseURI.href,
				this.codec,
				`${this.baseURI.origin}${this.directory}`
			);
		}
	}
	get baseURI(): URL {
		return new URL(getBaseURI());
	}
	loadHTML(script: string) {
		const parsed = parseHTML(decode(script));
		const fragment = document.createDocumentFragment();
		fragment.append(parsed.documentElement);
		const [cloned, appendCallback] = cloneRawNode(fragment);

		if (parsed.doctype) {
			document.doctype!.replaceWith(parsed.doctype);
		} else {
			document.doctype!.remove();
		}

		document.documentElement.replaceWith(cloned);

		appendCallback();
	}
}

export default createClientFactory(DocumentClient);
