import StompURL from '../StompURL';
import { parseRoutedURL, ROUTE_PROTOCOLS } from '../routeURL';
import Client from './Client';
import cloneRawNode, { parseHTML } from './cloneNode';
import { decode } from 'entities';

const getBaseURI = Reflect.getOwnPropertyDescriptor(Node.prototype, 'baseURI')!
	.get!;

// runtime document !== document in 0.001 ms!?!?!?

export default class DocumentClient extends Client {
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

		if (parsed.doctype) {
			document.doctype!.replaceWith(parsed.doctype);
		} else {
			document.doctype!.remove();
		}

		document.documentElement.remove();

		// jump out of the DOM "write stream" so we can start loading our own HTML
		setTimeout(() => {
			const node = document.createElement('div');
			node.append(cloned);

			document.open();
			console.log(
				document.baseURI,
				this.baseURI.toString(),
				this.url.toString()
			);
			document.write(
				(document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : '') +
					node.innerHTML
			);
			document.close();
		});

		appendCallback();
	}
}
