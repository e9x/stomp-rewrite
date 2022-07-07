import StompURL from '../../../StompURL';
import { parseRoutedURL, routeXHR } from '../../../routeURL';
import Module from '../../Module';
import ProxyModule, {
	classConstant,
	domObjectConstructor,
	onEventTarget,
} from '../../modules/Proxy';
import WorkerClient from '../Client';

export default class XMLHttpRequestModule extends Module<WorkerClient> {
	apply() {
		const instances = new WeakSet();
		const real = Symbol();
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;

		const proxyModule = this.client.getModule(ProxyModule)!;

		class XMLHttpRequestEventTargetProxy extends EventTarget {
			constructor(key: symbol) {
				if (key === real) {
					super();
					instances.add(this);
				} else {
					throw new TypeError(`Illegal constructor`);
				}
			}
		}

		const decoder = new TextDecoder('utf-8');

		const XMLHttpRequestResponseType = [
			'',
			'arraybuffer',
			'blob',
			'document',
			'json',
			'text',
			'moz-chunked-arraybuffer',
			'ms-stream',
		];

		const UNSENT = 0;
		const OPENED = 1;
		const HEADERS_RECEIVED = 2;
		const LOADING = 3;
		const DONE = 4;

		class XMLHttpRequestProxy extends XMLHttpRequestEventTargetProxy {
			constructor() {
				super(real);
			}
			#headers = new Headers();
			#responseHeaders = new Headers();
			#method = '';
			#url = '';
			#async = true;
			#username: string | void = undefined;
			#password: string | void = undefined;
			#responseType = '';
			#responseText = '';
			#readyState = UNSENT;
			#responseURL = '';
			#responseXML = null;
			#response: null | string | ArrayBuffer = null;
			#status = 0;
			#statusText = '';
			#abort = new AbortController();
			get status() {
				return this.#status;
			}
			get statusText() {
				return this.#statusText;
			}
			#dispatchReadyState() {
				if (!this.#async && this.#readyState !== DONE) {
					return;
				}

				this.dispatchEvent(new Event('readystatechange'));
			}
			get #loadingOrDone() {
				return this.#readyState === LOADING || this.#readyState === DONE;
			}
			get responseText() {
				if (this.responseType !== '' && this.responseType !== 'text')
					throw new DOMException(
						`Failed to read the 'responseText' property from 'XMLHttpRequest': The value is only accessible if the object's 'responseType' is '' or 'text' (was '${
							this.#responseType
						}').`
					);

				return this.#responseText;
			}
			get responseXML() {
				return this.#responseXML;
			}
			get responseType() {
				return this.#responseType;
			}
			set responseType(value) {
				if (this.#loadingOrDone) {
					throw new DOMException(
						`Failed to set the 'responseType' property on 'XMLHttpRequest': The response type cannot be set if the object's state is LOADING or DONE.`
					);
				} else if (!this.#async) {
					throw new DOMException(
						`Failed to set the 'responseType' property on 'XMLHttpRequest': The response type cannot be changed for synchronous requests made from a document.`
					);
				}

				if (!XMLHttpRequestResponseType.includes(value)) {
					console.warn(
						`The provided value '${value}' is not a valid enum value of type XMLHttpRequestResponseType.`
					);
					return;
				}

				this.#responseType = value;
			}
			get readyState() {
				return this.#readyState;
			}
			get responseURL() {
				return this.#responseURL;
			}
			get response() {
				return this.#response;
			}
			#onHeaders(error: Error): void;
			#onHeaders(error: void, response: Response, url: string): void;
			#onHeaders(
				error: Error | void,
				response: Response | void,
				url: string | void
			) {
				if (error) {
					console.error(error);
				}

				this.#readyState = HEADERS_RECEIVED;
				this.#status = response!.status;
				this.#statusText = response!.statusText;
				const parsed = parseRoutedURL(
					url!,
					that.client.codec,
					`${location.origin}${that.client.directory}`
				);
				this.#responseURL = parsed.url.toString();
				this.#responseHeaders = response!.headers;
				this.#dispatchReadyState();

				this.#readyState = LOADING;
				this.#dispatchReadyState();

				/*
				// chrome doesn't dispatch loadstart
				this.dispatchEvent(new ProgressEvent('loadstart', {
					total: response.headers.get('content-length') || 1000
				}));
				*/
			}
			#onDone(error: unknown): void;
			#onDone(error: void, response: Response, buffer: ArrayBuffer): void;
			#onDone(
				error: unknown | void,
				response: Response | void,
				buffer: ArrayBuffer | void
			) {
				if (error !== undefined) {
					if (this.#abort.signal.aborted) {
						return;
					}

					console.error('error', error);
					this.dispatchEvent(new Event('error'));
					return;
				}

				this.#readyState = DONE;
				this.#response = buffer!;

				switch (this.responseType) {
					case 'arraybuffer':
						this.#response = buffer!;
						break;
					case 'document':
						this.#response = null;
						break;
					case 'text':
						this.#response = decoder.decode(this.#response);
						this.#responseText = this.#response;
						break;
				}

				this.#dispatchReadyState();

				const parsedLen = parseInt(
					response!.headers.get('content-length') || ''
				);
				const length = isNaN(parsedLen) ? 1000 : parsedLen;

				this.dispatchEvent(
					new ProgressEvent('load', {
						total: length,
					})
				);

				this.dispatchEvent(
					new ProgressEvent('loadend', {
						total: length,
					})
				);
			}
			#fetch(url: string | URL, init: RequestInit) {
				if (this.#async) {
					init.signal = this.#abort.signal;

					fetch(url, init)
						.then(async (response) => {
							this.#onHeaders(undefined, response, response.url);
							const buffer = await response.arrayBuffer();
							this.#onDone(undefined, response, buffer);
						})
						.catch((error) => this.#onDone(error));
				} else {
					throw new Error(
						'Synchronous requests are not supported in this context.'
					);
				}
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
			overrideMimeType(mime: string) {}
			abort() {
				if (!this.#async) {
					return;
				}

				this.#abort.abort();
				this.dispatchEvent(new ProgressEvent('abort'));
			}
			open(
				method: string,
				url: string,
				async = true,
				username: string | void,
				password: string | void
			) {
				this.#readyState = OPENED;
				this.#method = String(method).toUpperCase();

				this.#url = String(url);

				if (async) {
					this.#async = true;
				} else {
					this.#async = false;
				}

				if (username) {
					this.#username = String(password);
				} else {
					this.#username = undefined;
				}

				if (password) {
					this.#password = String(password);
				} else {
					this.#password = undefined;
				}

				// this.#dispatchReadyState();
			}
			setRequestHeader(header: string, value: string) {
				if (this.#readyState !== OPENED) {
					throw new DOMException(
						`Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.`
					);
				}

				// behavior is equal to append
				this.#headers.append(header, value);
			}
			send(body: string) {
				this.#readyState = OPENED;

				const options: RequestInit = {
					method: this.#method,
					headers: this.#headers,
				};

				if (
					body !== undefined &&
					body !== null &&
					!['GET', 'HEAD'].includes(this.#method)
				) {
					options.body = body;
				}

				this.#fetch(
					routeXHR(
						new StompURL(
							new URL(this.#url, that.client.url.toString()),
							that.client.url
						)
					),
					options
				);
			}
			getResponseHeader(header: string) {
				return this.#responseHeaders.get(header);
			}
			getAllResponseHeaders() {
				let result = '';

				for (const [header, value] of this.#responseHeaders) {
					result += `${header}: ${value}\r\n`;
				}

				return result;
			}
		}

		const globalProxy = domObjectConstructor(XMLHttpRequestProxy);
		const globalTargetProxy = domObjectConstructor(
			XMLHttpRequestEventTargetProxy
		);

		onEventTarget(globalTargetProxy.prototype, 'abort');
		onEventTarget(globalTargetProxy.prototype, 'error');
		onEventTarget(globalTargetProxy.prototype, 'load');
		onEventTarget(globalTargetProxy.prototype, 'loadend');
		onEventTarget(globalTargetProxy.prototype, 'loadstart');
		onEventTarget(globalTargetProxy.prototype, 'progress');
		onEventTarget(globalTargetProxy.prototype, 'timeout');

		onEventTarget(globalProxy.prototype, 'readystatechange');
		classConstant(globalProxy, 'UNSENT', UNSENT);
		classConstant(globalProxy, 'OPENED', OPENED);
		classConstant(globalProxy, 'HEADERS_RECEIVED', HEADERS_RECEIVED);
		classConstant(globalProxy, 'LOADING', LOADING);
		classConstant(globalProxy, 'DONE', DONE);

		proxyModule.mirrorClass(XMLHttpRequest, globalProxy, instances);
		proxyModule.mirrorClass(
			XMLHttpRequestEventTarget,
			globalTargetProxy,
			instances
		);

		(global as any).XMLHttpRequest = globalProxy;
		(global as any).XMLHttpRequestEventTarget = globalTargetProxy;
	}
}
