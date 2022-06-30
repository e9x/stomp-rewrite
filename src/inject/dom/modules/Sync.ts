import { urlLike } from '../../../StompURL';
import { decodeCookie } from '../../../encodeCookie';
import { geckoXHR, queueXHR } from '../../../routeURL';
import Module from '../../Module';
import DocumentClient from '../Client';

const statusEmpty: number[] = [101, 204, 205, 304];

// 10 seconds
const maxCycles = 10 * 200000000;
const maxLoopbackCycles = 10000;

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
		const response = this.fetch(
			url,
			{
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify(args),
			},
			true
		);

		const parsed = JSON.parse(decoder.decode(response.rawArrayBuffer));

		if (response.ok) {
			return parsed;
		} else {
			throw parsed;
		}
	}
	/**
	 * Synchronous ServiceWorker fetch API
	 * @param url
	 * @param init
	 * @param loopback goes to serviceworker route that does not fetch external urls
	 */
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
		const regex = new RegExp(`${id}=(\\d+),(.*?)(;|$)`);

		navigator.sendBeacon(
			queueXHR(this.client.url),
			JSON.stringify({
				id,
				data,
			})
		);

		const sMaxCycles = loopback ? maxLoopbackCycles : maxCycles;

		for (let cycles = 0; cycles < sMaxCycles; cycles++) {
			const cookie = document.cookie;
			const match = cookie.match(regex);

			if (!match) continue;

			const clearCookies: string[] = [id];

			const chunks = parseInt(match[1]);

			let joinedValue = match[2];

			for (let i = 0; i < chunks; i++) {
				const cookieName = `${id}${i}`;
				const regex = new RegExp(`${cookieName}=(.*?)(;|$)`);
				const match = cookie.match(regex);

				if (!match) {
					console.warn(`Couldn't find chunk ${i}`);
					continue;
				}

				clearCookies.push(cookieName);

				const [, value] = match;

				joinedValue += value;
			}

			setTimeout(() => {
				for (const cookieName of clearCookies) {
					document.cookie = `${cookieName}=; path=/; expires=${new Date(0)}`;
				}
			});

			return createResponse(JSON.parse(decodeCookie(joinedValue)));
		}

		throw new RangeError(
			`Reached max cycles (${sMaxCycles}) when requesting ${url}`
		);
	}
}
