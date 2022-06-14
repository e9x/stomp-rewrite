import { parse, parseFragment, serialize } from 'parse5';
import { Node } from 'parse5/dist/tree-adapters/default.js';

import { createDataURI, parseDataURI, routeURL } from './routeURL.js';
import StompURL from './StompURL.js';

export function routeHTML(resource: StompURL, url: StompURL) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({ mime, data: modifyHTML(data, url), attributes });
	}

	return routeURL('html', resource);
}

export function modifyHTML(
	script: string,
	url: StompURL,
	fragment = false
): string {
	const tree: Node = fragment ? parseFragment(script) : parse(script);

	return serialize(tree);
}

export function restoreHTML(
	script: string,
	url: StompURL,
	fragment = false
): string {
	const tree: Node = fragment ? parseFragment(script) : parse(script);

	return serialize(tree);
}
