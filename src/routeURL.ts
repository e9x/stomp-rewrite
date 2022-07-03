import GenericCodec from './Codecs';
import StompURL from './StompURL';

export const ROUTE_PROTOCOLS = ['http:', 'https:'];

export function routeURL(resourceType: string, url: StompURL) {
	if (!ROUTE_PROTOCOLS.includes(url.url.protocol)) {
		// url is out of the scope of Stomp
		return url.toString();
	}

	return `${url.directory}${resourceType}/${url.encode()}${url.url.hash}`;
}

/**
 * Raw binary data
 */
export function routeBinary(resource: StompURL) {
	if (resource.url.protocol === 'data:') {
		return resource.toString();
	}

	return routeURL('binary', resource);
}

/**
 * navigator.postBeacon request
 */
export function routeXHR(resource: StompURL) {
	if (resource.url.protocol === 'data:') {
		return resource.toString();
	}

	return routeURL('xhr', resource);
}

export function injectDocumentJS(url: StompURL) {
	return `${url.directory}injectDocument.js`;
}

export function injectWorkerJS(url: StompURL) {
	return `${url.directory}injectWorker.js`;
}

export function geckoXHR(url: StompURL) {
	return `${url.directory}gxhr`;
}

export function queueXHR(url: StompURL) {
	return `${url.directory}xhr`;
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

export interface ParsedRoutedURL {
	resource: string;
	url: StompURL;
}

export function parseRoutedURL(
	routed: string,
	codec: GenericCodec,
	directory: string
): ParsedRoutedURL {
	if (!routed.startsWith(directory)) {
		throw new Error('Outside directory');
	}

	const hashIndex = routed.indexOf('#');

	const path =
		hashIndex === -1
			? routed.slice(directory.length)
			: routed.slice(directory.length, hashIndex);

	const split = path.indexOf('/');

	if (split === -1) {
		throw new Error('Invalid route');
	}

	const resource = path.slice(0, split);
	const encoded = path.slice(split + 1);
	const decoded = codec.decode(encoded);
	const url = new URL(decoded);

	url.hash = hashIndex === -1 ? '' : routed.slice(hashIndex);

	return {
		resource: resource,
		url: new StompURL(url, codec, directory),
	};
}

export declare interface DataURI {
	attributes: string[];
	mime: string;
	data: string;
}

export function parseDataURI(pathname: string): DataURI {
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

export function createDataURI(data: DataURI) {
	return `data:${[data.mime, ...data.attributes].join(';')},${
		data.attributes.includes('base64') ? btoa(data.data) : data.data
	}`;
}
