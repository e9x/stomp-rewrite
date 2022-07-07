import StompURL from '../StompURL';

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
	url: StompURL
) => string;

export declare type AdditionalFilter = (
	headers: Readonly<Headers>,
	filteredHeaders: Headers,
	url: StompURL
) => void;

// native as in the browser requesting an image from /binary/ or document from /html/
export function filterNativeRequestHeaders(
	headers: Readonly<Headers>,
	url: StompURL,
	additionalFilter: AdditionalFilter | void
): Headers {
	const filteredHeaders = new Headers(headers);

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url);
	}

	return filteredHeaders;
}

export function filterResponseHeaders(
	headers: Readonly<Headers>,
	url: StompURL,
	transformRoute: RouteTransform,
	additionalFilter: AdditionalFilter | void
): Headers {
	const filteredHeaders = new Headers(headers);

	if (headers.has('location')) {
		filteredHeaders.set(
			'location',
			transformRoute(
				new StompURL(
					new URL(filteredHeaders.get('location')!, url.toString()),
					url
				),
				url
			)
		);
	}

	for (const header of removeHeaders) {
		filteredHeaders.delete(header);
	}

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url);
	}

	return filteredHeaders;
}
