import StompURL from '../../StompURL';
import { ParsedConfig } from '../../config';
import { modifyJS } from '../../rewriteJS';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../../routeURL';
import Client from '../Client';
import cloneRawNode, { parseHTML } from './cloneNode';
import { decode } from 'entities';

let globalParsingState: 'parsingBeforeWrite' | void = undefined;

export function getGlobalParsingState(): typeof globalParsingState {
	return globalParsingState;
}

export function setGlobalParsingState(value: typeof globalParsingState) {
	globalParsingState = value;
}

const write = document.write;

export function documentWrite(script: string) {
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
		setGlobalParsingState('parsingBeforeWrite');

		const parsed = parseHTML(decode(script));
		const fragment = document.createDocumentFragment();
		fragment.append(parsed.documentElement);

		document.documentElement.remove();

		const node = document.createElement('div');
		node.append(cloneRawNode(fragment));

		setGlobalParsingState();

		for (const script of node.querySelectorAll('script')) {
			if (script.text) {
				script.text = `document.currentScript.textContent = ${JSON.stringify(
					script.textContent
				)};
				${modifyJS(script.text, this.url, this.config, 'generic')}
				`;
			}
		}

		const newDocument =
			(parsed.doctype ? `<!DOCTYPE ${parsed.doctype.name}>` : '') +
			node.innerHTML;

		// jump out of the DOM "write stream" so we can start loading our own HTML
		setTimeout(() => {
			document.open();

			documentWrite(newDocument);

			document.close();
		});
	}
}
