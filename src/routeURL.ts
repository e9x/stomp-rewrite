import Codec from './Codecs.js';
import StompURL from './StompURL.js';

export declare type Resource = 'binary' | 'html' | 'js' | 'css' | 'manifest';

export function routeURL(url: StompURL, resource: Resource): string {
	return `${resource}/${url.encode()}`;
}

export function parseRoutedURL(
	routed: string,
	codec: Codec
): {
	resource: Resource;
	url: StompURL;
} {
	const split = routed.indexOf('/');
	if (split === -1) {
		throw new Error('Invalid route');
	}

	const resource = routed.slice(0, split);
	const encoded = routed.slice(split + 1);
	const decoded = codec.decode(encoded);
	const url = new URL(decoded);

	return {
		resource: <Resource>resource,
		url: new StompURL(url, codec),
	};
}
