import { urlLike } from '../../../StompURL';
import { decodeCookie } from '../../../encodeCookie';
import { geckoXHR, queueXHR } from '../../../routeURL';
import Module from '../../Module';
import DocumentClient from '../Client';

const statusEmpty: number[] = [101, 204, 205, 304];

// 10 seconds
const maxCycles = 10 * 200000000;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

interface SyncResponse extends Response {
	rawUrl: string;
	rawArrayBuffer: ArrayBuffer;
}

interface SyncResponseInit {
	error: { message: string };
	textArrayBuffer: string;
	init: ResponseInit;
	url: string;
}

function createResponse(init: SyncResponseInit): SyncResponse {
	if (init.error) {
		throw new TypeError(init.error.message);
	}

	const { buffer: rawArrayBuffer } = encoder.encode(init.textArrayBuffer);

	let response: Response & Partial<SyncResponse>;

	if (!init) {
		throw new Error('No init');
	}

	if (statusEmpty.includes(init.init.status!)) {
		response = new Response(undefined, init.init);
	} else {
		response = new Response(rawArrayBuffer, init.init);
	}

	response.rawUrl = init.url;
	response.rawArrayBuffer = rawArrayBuffer;

	return <SyncResponse>response;
}

export default class SyncModule extends Module<DocumentClient> {
	jsonAPI(url: urlLike, ...args: any[]) {
		const response = this.fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(args),
		});

		const parsed = JSON.parse(decoder.decode(response.rawArrayBuffer));

		if (response.ok) {
			return parsed;
		} else {
			throw parsed;
		}
	}
	fetch(
		url: urlLike,
		init: Omit<RequestInit, 'signal'> = {},
		loopback = false
	): SyncResponse {
		const processInit: SerializableRequestInit = {};

		processInit.cache = init.cache;
		processInit.credentials = init.credentials;
		processInit.integrity = init.integrity;
		processInit.keepalive = init.keepalive;
		processInit.method = init.method;
		processInit.mode = init.mode;
		processInit.redirect = init.redirect;
		processInit.referrer = init.referrer;
		processInit.referrerPolicy = init.referrerPolicy;

		if (init.headers instanceof Headers) {
			processInit.headers = Object.fromEntries(init.headers.entries());
		} else if (typeof init.headers === 'object' && init.headers === null) {
			processInit.headers = init.headers;
		}

		const data: ProcessData = {
			url: new URL(url, location.toString()).toString(),
			init: processInit,
		};

		if (init.body instanceof ArrayBuffer) {
			data.body = decoder.decode(init.body);
		} else if (typeof init.body === 'string') {
			data.body = init.body;
		}

		if (navigator.userAgent.includes('gecko')) {
			const http = new XMLHttpRequest();

			http.open('POST', geckoXHR(this.client.url), false);
			http.send(JSON.stringify(data));

			return createResponse(JSON.parse(http.responseText));
		}

		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);

		navigator.sendBeacon(
			queueXHR(this.client.url),
			JSON.stringify({
				id,
				data,
			})
		);

		let cookie = '';
		let cookieCount;
		let remainder = 0;

		if (loopback) {
			// goes to serviceworker route that does not fetch external urls
			remainder = 10;
		} else {
			remainder = 5000;
		}

		for (let cycles = 0; cycles < maxCycles; cycles++) {
			if (cycles % remainder !== 0) {
				continue;
			}

			cookie = document.cookie;
			const match = cookie.match(regex);

			if (!match) continue;

			const [, value] = match;

			cookieCount = parseInt(value);

			document.cookie = `${id}=; path=/; expires=${new Date(0)}`;

			break;
		}

		if (cookieCount === undefined) {
			throw new RangeError(
				`Reached max cycles (${maxCycles}) when requesting ${url}`
			);
		}

		let joinedValue = '';

		for (let i = 0; i < cookieCount; i++) {
			const regex = new RegExp(`${id}${i}=(.*?)(;|$)`);
			const match = cookie.match(regex);

			if (!match) {
				console.warn(`Couldn't find chunk ${i}`);
				continue;
			}

			document.cookie = `${id}${i}=; path=/; expires=${new Date(0)}`;

			const [, value] = match;

			joinedValue += value;
		}

		return createResponse(JSON.parse(decodeCookie(joinedValue)));
	}
}
