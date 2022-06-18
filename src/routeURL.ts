import GenericCodec from './Codecs.js';
import StompURL from './StompURL.js';

export const ROUTE_PROTOCOLS = ['http:', 'https:'];

export function routeURL(resourceType: string, url: StompURL) {
	if (!ROUTE_PROTOCOLS.includes(url.url.protocol)) {
		throw new RangeError(
			`The following protocols are supported: ${ROUTE_PROTOCOLS}`
		);
	}

	return `${url.directory}${resourceType}/${url.encode()}${url.url.hash}`;
}

export function routeBinary(resource: StompURL) {
	if (resource.url.protocol === 'data:') {
		return resource.toString();
	}

	return routeURL('binary', resource);
}

export function injectDocumentJS(url: StompURL) {
	return `${url.directory}injectDocument.js`;
}

export function injectWorkerJS(url: StompURL) {
	return `${url.directory}injectWorker.js`;
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
