// import createHttpError from 'http-errors';
import GenericCodec from '../Codecs';
import StompURL from '../StompURL';
import { codecType, Config, ParsedConfig } from '../config';
import { capitalizeHeaders, trimNonStandardHeaders } from '../headers';
import { modifyCSS, routeCSS } from '../rewriteCSS';
import { modifyHTML, modifyRefresh, routeHTML } from '../rewriteHTML';
import { modifyJS, routeJS } from '../rewriteJS';
import { ScriptType } from '../rewriteJS';
import { parseRoutedURL, routeBinary } from '../routeURL';
import Cookies from './Cookies';
import Router from './Router';
import {
	AdditionalFilter,
	RouteTransform,
	filterNativeRequestHeaders,
	filterResponseHeaders,
} from './filterHeaders';
import BareClient from '@tomphttp/bare-client';

export const statusEmpty = [101, 204, 205, 304];

const integrityHeaders: string[] = ['Content-MD5'];

const BODY_ILLEGAL = ['GET', 'HEAD'];

type BodyTransform = (
	url: StompURL,
	response: Response,
	responseHeaders: Headers
) => Promise<BodyInit | false>;

interface Rewriter {
	codec: GenericCodec;
	directory: string;
	bare: BareClient;
	bareServer: string;
	config: Config;
	cookies: Cookies;
}

function genericForward(
	rewriter: Rewriter,
	transformBody: BodyTransform | void,
	transformRoute: RouteTransform,
	additionalRequestFilter: AdditionalFilter | void,
	additionalResponseFilter: AdditionalFilter | void
) {
	return async function (serverRequest: Request): Promise<Response> {
		const oURL = new URL(serverRequest.url);
		const { url } = parseRoutedURL(
			serverRequest.url,
			rewriter.codec,
			`${oURL.origin}${rewriter.directory}`
		);

		const requestHeaders = filterNativeRequestHeaders(
			serverRequest.headers,
			url,
			additionalRequestFilter
		);

		requestHeaders.set(
			'cookie',
			(await rewriter.cookies.get(url.url)).toString()
		);

		requestHeaders.set('sec-fetch-dest', serverRequest.destination);

		const response = await rewriter.bare.fetch(url.toString(), {
			method: serverRequest.method,
			cache: serverRequest.cache,
			redirect: 'manual',
			// redirect: serverRequest.redirect,
			body:
				(!BODY_ILLEGAL.includes(serverRequest.method) &&
					(await serverRequest.blob())) ||
				undefined,
			headers: capitalizeHeaders(requestHeaders),
		});

		const responseHeaders = filterResponseHeaders(
			response.headers,
			url,
			transformRoute,
			additionalResponseFilter
		);

		for (const header in response.rawHeaders) {
			if (header.toLowerCase() === 'set-cookie') {
				await rewriter.cookies.set(response.rawHeaders[header], url.url);
			}
		}

		let body: BodyInit | undefined;

		if (statusEmpty.includes(+response.status)) {
			body = undefined;
		} else {
			const transformed = transformBody
				? await transformBody(url, response, responseHeaders)
				: false;

			body = transformed !== false ? transformed : response.body!;
		}

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		});
	};
}

const htmlMimes = ['image/svg+xml', 'text/html', ''];

export function getMime(contentType: string): string {
	return contentType.split(';')[0];
}

export function registerRewrites(
	router: Router,
	init: ParsedConfig,
	cookies: Cookies
) {
	const rewriter: Rewriter = {
		get config() {
			return {
				directory: this.directory,
				codec: codecType(this.codec),
				bareServer: this.bareServer,
				bareClientData: this.bare.data,
			};
		},
		cookies,
		codec: init.codec,
		directory: init.directory,
		bare: new BareClient(init.bareServer),
		bareServer: init.bareServer,
	};

	router.routes.set(
		/^\/binary\//,
		genericForward(
			rewriter,
			undefined,
			(resource) => routeBinary(resource),
			undefined,
			(headers, filteredHeaders) => {
				trimNonStandardHeaders(filteredHeaders);
			}
		)
	);

	router.routes.set(/^\/process$/, async (request) => {
		const surl = new StompURL(
			await request.text(),
			rewriter.codec,
			rewriter.directory
		);

		return new Response(routeHTML(surl, surl, rewriter.config), {
			headers: {
				'content-type': 'text/plain',
			},
		});
	});

	const scriptTypeFactory = (type: ScriptType) =>
		genericForward(
			rewriter,
			async (url, response) =>
				response.ok &&
				modifyJS(await response.text(), url, rewriter.config, type),
			(resource, url) => routeJS(resource, url, rewriter.config, type),
			undefined,
			(headers, filteredHeaders) => {
				trimNonStandardHeaders(filteredHeaders);

				for (const header of integrityHeaders) {
					filteredHeaders.delete(header);
				}
			}
		);

	router.routes.set(/^\/js:generic\//, scriptTypeFactory('generic'));
	router.routes.set(
		/^\/js:genericModule\//,
		scriptTypeFactory('genericModule')
	);
	router.routes.set(/^\/js:worker\//, scriptTypeFactory('worker'));
	router.routes.set(/^\/js:workerModule\//, scriptTypeFactory('workerModule'));

	router.routes.set(/^\/client$/, () => new Response());

	router.routes.set(
		/^\/css\//,
		genericForward(
			rewriter,
			async (url, response) =>
				response.ok && modifyCSS(await response.text(), url),
			(resource, url) => routeCSS(resource, url),
			undefined,
			(headers, filteredHeaders) => {
				trimNonStandardHeaders(filteredHeaders);

				for (const header of integrityHeaders) {
					filteredHeaders.delete(header);
				}
			}
		)
	);

	router.routes.set(
		/^\/html\//,
		genericForward(
			rewriter,
			async (url, response, responseHeaders) =>
				htmlMimes.includes(
					getMime(responseHeaders.get('content-type') || '')
				) && modifyHTML(await response.text(), url, rewriter.config),
			(resource, url) => routeHTML(resource, url, rewriter.config),
			undefined,
			(headers, filteredHeaders, url) => {
				trimNonStandardHeaders(filteredHeaders);

				if (headers.has('x-frame-options')) {
					filteredHeaders.delete('x-frame-options');
				}

				if (headers.has('refresh')) {
					filteredHeaders.set(
						'refresh',
						modifyRefresh(headers.get('refresh')!, url, rewriter.config)
					);
				}

				for (const header of integrityHeaders) {
					filteredHeaders.delete(header);
				}
			}
		)
	);

	router.routes.set(/^\/html:form\//, (serverRequest) => {
		const oURL = new URL(serverRequest.url);
		const { url } = parseRoutedURL(
			`${oURL.origin}${oURL.pathname}${oURL.hash}`, // exclude query
			rewriter.codec,
			`${oURL.origin}${rewriter.directory}`
		);

		url.url.search = oURL.search;

		return new Response(undefined, {
			headers: {
				location: routeHTML(url, url, rewriter.config),
			},
			status: 307,
		});
	});

	// todo: parse more request headers
	router.routes.set(
		/^\/xhr\//,
		genericForward(rewriter, undefined, (resource) => routeBinary(resource))
	);
}
