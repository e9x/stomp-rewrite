import StompURL from '../../StompURL';
import { ParsedConfig } from '../../config';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../../routeURL';
import Client from '../Client';
import cloneRawNode, { parseHTML } from './cloneNode';
import { decode } from 'entities';

const write = document.write;

function documentWrite(script: string) {
	write.call(document, script);
}

const getBaseURI = Reflect.getOwnPropertyDescriptor(Node.prototype, 'baseURI')!
	.get!;

// runtime document !== document in 0.001 ms!?!?!?

export default class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		this.isDOM = true;
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
		return new URL(getBaseURI.call(document));
	}
	loadHTML(script: string) {
		const parsed = parseHTML(decode(script));
		const fragment = document.createDocumentFragment();
		fragment.append(parsed.documentElement);
		const [cloned, appendCallback] = cloneRawNode(fragment);

		document.documentElement.remove();

		// jump out of the DOM "write stream" so we can start loading our own HTML
		setTimeout(() => {
			const node = document.createElement('div');
			node.append(cloned);

			console.log(node.innerHTML);

			document.open();

			documentWrite(
				(parsed.doctype ? `<!DOCTYPE ${parsed.doctype.name}>` : '') +
					node.innerHTML
			);
			document.close();
		});

		appendCallback();
	}
}
