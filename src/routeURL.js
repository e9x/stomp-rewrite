import StompURL from './StompURL.js';

export const ROUTE_PROTOCOLS = ['http:', 'https:'];

/**
 *
 * @param {string} resource
 * @param {StompURL} url
 */
export function routeURL(resourceType, url) {
	if (!ROUTE_PROTOCOLS.includes(url.url.protocol)) {
		throw new RangeError(
			`The following protocols are supported: ${ROUTE_PROTOCOLS}`
		);
	}

	return `${url.directory}${resourceType}/${url.encode()}${url.url.hash}`;
}

/**
 * @param {StompURL} resource
 */
export function routeBinary(resource) {
	if (resource.url.protocol === 'data:') {
		return resource.toString();
	}

	return routeURL('binary', resource);
}

/*
// url will not be unrouted
// always store original url
 export function unrouteBinary(url) {
	if (url.url.protocol === 'data:') {
		return url.toString();
	}

	return parseRoutedURL()
}*/

/**
 *
 * @param {string} routed
 * @param {import('./Codecs.js').default} codec
 * @param {string} directory
 */
export function parseRoutedURL(routed, codec, directory) {
	if (!routed.startsWith(directory)) {
		throw new Error('Outside directory');
	}

	const path = routed.slice(directory.length);

	const split = path.indexOf('/');

	if (split === -1) {
		throw new Error('Invalid route');
	}

	const resource = path.slice(0, split);
	const encoded = path.slice(split + 1);
	const decoded = codec.decode(encoded);
	const url = new URL(decoded);

	return {
		resource: resource,
		url: new StompURL(url, codec, directory),
	};
}

/**
 *
 * @typedef {object} DataURI
 * @property {string[]} attributes
 * @property {string} type
 * @property {string} data
 */

/**
 *
 * @param {string} pathname
 * @returns {DataURI}
 */
export function parseDataURI(pathname) {
	const comma = pathname.indexOf(',');
	const type = pathname.slice(0, comma);
	let data = pathname.slice(comma + 1);
	const [mime, ...attributes] = type.split(';');

	if (attributes.includes('base64')) {
		data = atob(data);
	}

	return {
		mime,
		attributes,
		data,
	};
}

/**
 *
 * @param {DataURI} data
 */
export function createDataURI(data) {
	return `data:${[data.mime, ...data.attributes].join(';')},${
		data.attributes.includes('base64') ? btoa(data.data) : data.data
	}`;
}
