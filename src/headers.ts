// ripped from https://quiche.googlesource.com/quiche/+/refs/heads/main/quiche/balsa/standard_header_map.cc
export const standardHeaderNames: string[] = [
	'Accept',
	'Accept-Charset',
	'Accept-CH',
	'Accept-CH-Lifetime',
	'Accept-Encoding',
	'Accept-Language',
	'Accept-Ranges',
	'Access-Control-Allow-Credentials',
	'Access-Control-Allow-Headers',
	'Access-Control-Allow-Methods',
	'Access-Control-Allow-Origin',
	'Access-Control-Expose-Headers',
	'Access-Control-Max-Age',
	'Access-Control-Request-Headers',
	'Access-Control-Request-Method',
	'Age',
	'Allow',
	'Authorization',
	'Cache-Control',
	'Connection',
	'Content-Disposition',
	'Content-Encoding',
	'Content-Language',
	'Content-Length',
	'Content-Location',
	'Content-Range',
	'Content-Security-Policy',
	'Content-Security-Policy-Report-Only',
	'X-Content-Security-Policy',
	'X-Content-Security-Policy-Report-Only',
	'X-WebKit-CSP',
	'X-WebKit-CSP-Report-Only',
	'Content-Type',
	'Content-MD5',
	'X-Content-Type-Options',
	'Cookie',
	'Cookie2',
	'Cross-Origin-Resource-Policy',
	'Cross-Origin-Opener-Policy',
	'Date',
	'DAV',
	'Depth',
	'Destination',
	'DNT',
	'DPR',
	'Early-Data',
	'ETag',
	'Expect',
	'Expires',
	'Follow-Only-When-Prerender-Shown',
	'Forwarded',
	'From',
	'Host',
	'HTTP2-Settings',
	'If',
	'If-Match',
	'If-Modified-Since',
	'If-None-Match',
	'If-Range',
	'If-Unmodified-Since',
	'Keep-Alive',
	'Label',
	'Last-Modified',
	'Link',
	'Location',
	'Lock-Token',
	'Max-Forwards',
	'MS-Author-Via',
	'Origin',
	'Overwrite',
	'P3P',
	'Ping-From',
	'Ping-To',
	'Pragma',
	'Proxy-Connection',
	'Proxy-Authenticate',
	'Public-Key-Pins',
	'Public-Key-Pins-Report-Only',
	'Range',
	'Referer',
	'Referrer-Policy',
	'Refresh',
	'Report-To',
	'Retry-After',
	'Sec-Fetch-Dest',
	'Sec-Fetch-Mode',
	'Sec-Fetch-Site',
	'Sec-Fetch-User',
	'Sec-Metadata',
	'Sec-Token-Binding',
	'Sec-Provided-Token-Binding-ID',
	'Sec-Referred-Token-Binding-ID',
	'Sec-WebSocket-Accept',
	'Sec-WebSocket-Extensions',
	'Sec-WebSocket-Key',
	'Sec-WebSocket-Protocol',
	'Sec-WebSocket-Version',
	'Server',
	'Server-Timing',
	'Service-Worker',
	'Service-Worker-Allowed',
	'Service-Worker-Navigation-Preload',
	'Set-Cookie',
	'Set-Cookie2',
	'Status-URI',
	'Strict-Transport-Security',
	'SourceMap',
	'Timeout',
	'Timing-Allow-Origin',
	'Tk',
	'Trailer',
	'Trailers',
	'Transfer-Encoding',
	'TE',
	'Upgrade',
	'Upgrade-Insecure-Requests',
	'User-Agent',
	'X-OperaMini-Phone-UA',
	'X-UCBrowser-UA',
	'X-UCBrowser-Device-UA',
	'X-Device-User-Agent',
	'Vary',
	'Via',
	'CDN-Loop',
	'Warning',
	'WWW-Authenticate',
];

export const lowercaseStandardHeaderNames = standardHeaderNames.map((header) =>
	header.toLowerCase()
);

export type RawHeaders = { [key: string]: string | string[] };

export function capitalizeHeader(header: string) {
	const index = lowercaseStandardHeaderNames.indexOf(header);

	// non-standard
	if (index === -1) {
		return header;
	}

	return standardHeaderNames[index];
}

export function capitalizeHeaders(headers: Headers): RawHeaders {
	const rawHeaders: RawHeaders = {};

	for (const [header, value] of headers) {
		rawHeaders[capitalizeHeader(header)] = value;
	}

	return rawHeaders;
}

export function isStandardHeader(header: string) {
	return lowercaseStandardHeaderNames.includes(header.toLowerCase());
}

export function trimNonStandardHeaders(headers: Readonly<Headers>): Headers {
	const result = new Headers(headers);

	for (const [header, value] of headers) {
		if (isStandardHeader(header)) {
			result.set(header, value);
		}
	}

	return result;
}
