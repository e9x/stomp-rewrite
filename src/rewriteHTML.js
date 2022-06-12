import { createDataURI, parseDataURI, routeURL } from './routeURL.js';

/**
 *
 * @param {import('./StompURL.js').default} resource
 * @param {import('./StompURL.js').default} url
 */
export function routeHTML(resource, url) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.pathname);
		return createDataURI({ mime, data: modifyHTML(data, url), attributes });
	}

	return routeURL('html', resource);
}

/**
 *
 * @param {string} script
 * @param {import('./StompURL.js').default} url
 * @param {boolean} fragment
 */
export function modifyHTML(script, url, fragment) {}
