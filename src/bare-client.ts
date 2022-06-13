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
	export type BareBodyInit =
		| Blob
		| BufferSource
		| FormData
		| URLSearchParams
		| ReadableStream;
	export type BareFetchInit = {
		method?:
			| 'GET'
			| 'POST'
			| 'DELETE'
			| 'OPTIONS'
			| 'PUT'
			| 'PATCH'
			| 'UPDATE'
			| string;
		headers?: Headers | BareHeaders;
		body?: BareBodyInit;
		cache?:
			| 'default'
			| 'no-store'
			| 'reload'
			| 'no-cache'
			| 'force-cache'
			| 'only-if-cached'
			| string;
		redirect?: 'follow' | 'manual' | 'error' | string;
		signal?: AbortSignal;
	};
	export type BareClientData = object;

	export default class BareClient {
		data: BareClientData;
		constructor(server: string | URL, data?: BareClientData);
		request(
			method:
				| 'GET'
				| 'POST'
				| 'DELETE'
				| 'OPTIONS'
				| 'PUT'
				| 'PATCH'
				| 'UPDATE'
				| string,
			request_headers: BareHeaders,
			body: BareBodyInit,
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
				| 'only-if-cached'
				| string,
			signal: AbortSignal
		): Promise<BareResponse>;
		connect(
			request_headers: BareHeaders,
			protocol: 'ws:' | 'wss:',
			host: string,
			port: string | number,
			path: string
		): Promise<BareWebSocket>;
		fetch(url: string | URL, init?: BareFetchInit): Promise<BareResponseFetch>;
	}
}
