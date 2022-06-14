import StompURL from '../StompURL';

export declare type RouteTransform = (
	resource: StompURL,
	url: StompURL
) => string;

export declare type AdditionalFilter = (
	headers: Headers,
	filteredHeaders: Headers,
	url: StompURL
) => void;

// native as in the browser requesting an image from /binary/ or document from /html/
export function filterNativeRequestHeaders(
	headers: Headers,
	url: StompURL,
	additionalFilter?: AdditionalFilter
): Headers {
	const filteredHeaders = new Headers(headers);

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url);
	}

	return filteredHeaders;
}

export function filterResponseHeaders(
	headers: Headers,
	url: StompURL,
	transformRoute: RouteTransform,
	additionalFilter?: AdditionalFilter
): Headers {
	const filteredHeaders = new Headers(headers);

	if (headers.has('location')) {
		transformRoute(
			new StompURL(
				new URL(filteredHeaders.get('location')!, url.toString()),
				url
			),
			url
		);
	}

	if (additionalFilter) {
		additionalFilter(headers, filteredHeaders, url);
	}

	return filteredHeaders;
}
