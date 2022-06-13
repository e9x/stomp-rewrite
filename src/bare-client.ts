declare module 'bare-client' {
	export type BareHeaders = { [key: string]: string | string[] };
	export type BareMeta = { headers: BareHeaders };
	export type BareWebSocket = WebSocket & { meta: Promise<BareMeta> };
	export type BareResponse = Response & {
		rawResponse: Response;
		rawHeaders: BareHeaders;
		cached: boolean;
	};
	export type BareResponseFetch = BareResponse & { finalURL: string };
	export type BareFetchInit = {
		method: 'GET' | 'POST' | 'DELETE' | 'OPTIONS' | 'PUT' | 'PATCH' | 'UPDATE';
		headers: Headers | BareHeaders;
		body: Blob | BufferSource | FormData | URLSearchParams | ReadableStream;
		cache:
			| 'default'
			| 'no-store'
			| 'reload'
			| 'no-cache'
			| 'force-cache'
			| 'only-if-cached';
		redirect: 'follow' | 'manual' | 'error';
		signal: AbortSignal;
	};
	export type BareClientData = object;

	export default class BareClient {
		data: BareClientData;
		constructor(server: string | URL, data: BareClientData);
		request(
			method:
				| 'GET'
				| 'POST'
				| 'DELETE'
				| 'OPTIONS'
				| 'PUT'
				| 'PATCH'
				| 'UPDATE',
			request_headers: BareHeaders,
			body: Blob | BufferSource | FormData | URLSearchParams | ReadableStream,
			protocol: 'http:' | 'https:',
			host: string,
			port: string | number,
			path: string,
			cache:
				| 'default'
				| 'no-store'
				| 'reload'
				| 'no-cache'
				| 'force-cache'
				| 'only-if-cached',
			signal: AbortSignal
		): Promise<BareResponse>;
		connect(
			request_headers: BareHeaders,
			protocol: 'ws:' | 'wss:',
			host: string,
			port: string | number,
			path: string
		): Promise<BareWebSocket>;
		fetch(
			url: string | URL,
			init: BareFetchInit | undefined
		): Promise<BareResponseFetch>;
	}
}
