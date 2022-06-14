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

const REFRESH = /([; ]|^)url=(?:(['"])(((?!\2).)*)\2?|(.*);)/i;

// excellent resource
// https://web.archive.org/web/20210514140514/https://www.otsukare.info/2015/03/26/refresh-http-header
export function modifyRefresh(script: string, url: StompURL) {
	return script.replace(
		REFRESH,
		(_match, pre, _1, resource1, _3, resource2) => {
			const resource: string = resource1 || resource2;

			return `${pre}url=${routeHTML(
				new StompURL(new URL(resource, url.toString()), url),
				url
			)}`;
		}
	);
}
