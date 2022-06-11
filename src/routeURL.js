import StompURL from './StompURL.js';
export function routeURL(url, resource) {
	return `${resource}/${url.encode()}`;
}
export function parseRoutedURL(routed, codec) {
	const split = routed.indexOf('/');
	if (split === -1) {
		throw new Error('Invalid route');
	}
	const resource = routed.slice(0, split);
	const encoded = routed.slice(split + 1);
	const decoded = codec.decode(encoded);
	const url = new URL(decoded);
	return {
		resource: resource,
		url: new StompURL(url, codec),
	};
}
//# sourceMappingURL=routeURL.js.map
