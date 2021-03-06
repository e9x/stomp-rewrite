import StompURL from '../../StompURL';
import { ParsedConfig } from '../../config';
import { modifyJS } from '../../rewriteJS';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../../routeURL';
import Client from '../Client';
import cloneRawNode, { parseHTML } from './cloneNode';
import { decode } from 'entities';

export const onDocumentOpen: (() => void)[] = [];

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

const baseURIDescriptor = Reflect.getOwnPropertyDescriptor(
	Node.prototype,
	'baseURI'
)!;

const parentDescriptor = Reflect.getOwnPropertyDescriptor(global, 'parent')!;

const topDescriptor = Reflect.getOwnPropertyDescriptor(global, 'top')!;

// runtime document !== document in 0.001 ms!?!?!?

export default class DocumentClient extends Client {
	get parent(): typeof globalThis {
		return parentDescriptor.get!.call(global);
	}
	get top(): typeof globalThis {
		return topDescriptor.get!.call(global);
	}
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
		return new URL(baseURIDescriptor.get!.call(document));
	}
	loadHTML(script: string) {
		setGlobalParsingState('parsingBeforeWrite');

		const parsed = parseHTML(decode(script));

		// workaround:
		// we cannot append any descendants of parsed into any element (whether it is attached or detached) because it will pre-fetch the images in parsed
		// pass the entirety of parsed into cloneRawNode

		const node = document.createElement('div');
		node.append(cloneRawNode([parsed.documentElement]));

		setGlobalParsingState();

		for (const script of node.querySelectorAll('script')) {
			if (script.text) {
				script.text = `document.currentScript.textContent = ${JSON.stringify(
					script.textContent
				)};${modifyJS(script.text, this.url, this.config, 'generic')}`;
			}
		}

		const newDocument =
			(parsed.doctype ? `<!DOCTYPE ${parsed.doctype.name}>` : '') +
			node.innerHTML;

		// jump out of the DOM "write stream" so we can start loading our own HTML
		setTimeout(() => {
			document.open();
			for (const callback of onDocumentOpen) callback();
			documentWrite(newDocument);
			document.close();
		});
	}
}
