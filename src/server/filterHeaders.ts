import { Config } from '../config';
import { trimNonStandardHeaders } from '../headers';
import StompURL from '../StompURL';

export declare type RouteTransform = (
	resource: StompURL,
	url: StompURL,
	config: Config
) => string;

export declare type AdditionalFilter = (
	headers: Headers,
	filteredHeaders: Headers,
	url: StompURL,
	config: Config
) => void;

// native as in the browser requesting an image from /binary/ or document from /html/
export function filterNativeRequestHeaders(
	headers: Headers,
	url: StompURL,
	config: Config,

	additionalFilter?: AdditionalFilter
): Headers {
	const filteredHeaders = new Headers(headers);

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url, config);
	}

	return filteredHeaders;
}

export function filterResponseHeaders(
	headers: Headers,
	url: StompURL,
	config: Config,
	transformRoute: RouteTransform,
	additionalFilter?: AdditionalFilter
): Headers {
	const filteredHeaders = trimNonStandardHeaders(headers);

	if (headers.has('location')) {
		transformRoute(
			new StompURL(
				new URL(filteredHeaders.get('location')!, url.toString()),
				url
			),
			url,
			config
		);
	}

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url, config);
	}

	return filteredHeaders;
}
