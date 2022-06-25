import StompURL from '../StompURL';
import { Config } from '../config';
import { trimNonStandardHeaders } from '../headers';

const cspHeaders: string[] = [
	'Content-Security-Policy',
	'Content-Security-Policy-Report-Only',
	'X-Content-Security-Policy',
	'X-Content-Security-Policy-Report-Only',
	'X-WebKit-CSP',
	'X-WebKit-CSP-Report-Only',
];

const corsHeaders: string[] = [
	'Cross-Origin-Resource-Policy',
	'Cross-Origin-Opener-Policy',
];

const accessControlHeaders: string[] = [
	'Access-Control-Allow-Credentials',
	'Access-Control-Allow-Headers',
	'Access-Control-Allow-Methods',
	'Access-Control-Allow-Origin',
	'Access-Control-Expose-Headers',
	'Access-Control-Max-Age',
	'Access-Control-Request-Headers',
	'Access-Control-Request-Method',
];

const removeHeaders: string[] = [
	...cspHeaders,
	...corsHeaders,
	...accessControlHeaders,
];

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
		filteredHeaders.set(
			'location',
			transformRoute(
				new StompURL(
					new URL(filteredHeaders.get('location')!, url.toString()),
					url
				),
				url,
				config
			)
		);
	}

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url, config);
	}

	for (const header of removeHeaders) {
		filteredHeaders.delete(header);
	}

	return filteredHeaders;
}
