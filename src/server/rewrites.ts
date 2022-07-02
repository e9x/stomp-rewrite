// import createHttpError from 'http-errors';
import GenericCodec from '../Codecs';
import StompURL from '../StompURL';
import { codecType, Config, ParsedConfig } from '../config';
import { capitalizeHeaders, trimNonStandardHeaders } from '../headers';
import { modifyCSS, routeCSS } from '../rewriteCSS';
import { modifyHTML, modifyRefresh, routeHTML } from '../rewriteHTML';
import { modifyJS, routeJS } from '../rewriteJS';
import { scriptType } from '../rewriteJS';
import { modifyManifest, routeManifest } from '../rewriteManifest';
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
) => Promise<BodyInit>;

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
	transformBody: BodyTransform,
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

		const response = await rewriter.bare.fetch(url.toString(), {
			method: serverRequest.method,
			cache: serverRequest.cache,
			redirect: serverRequest.redirect,
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

		return new Response(
			statusEmpty.includes(+response.status)
				? undefined
				: await transformBody(url, response, responseHeaders),
			{
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
			}
		);
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
			async (_url, response) => response.body!,
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

	const scriptTypeFactory = (type: scriptType) =>
		genericForward(
			rewriter,
			async (url, response) =>
				modifyJS(await response.text(), url, rewriter.config, type),
			(resource, url) => routeJS(resource, url, rewriter.config, type),
			(headers, filteredHeaders) => {
				filteredHeaders.set('sec-fetch-dest', 'worker');
			},
			(headers, filteredHeaders) => {
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
			async (url, response) => modifyCSS(await response.text(), url),
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
			async (url, response, responseHeaders) => {
				if (
					htmlMimes.includes(getMime(responseHeaders.get('content-type') || ''))
				) {
					return modifyHTML(await response.text(), url, rewriter.config);
				}

				return response.body!;
			},
			(resource, url) => routeHTML(resource, url, rewriter.config),
			(headers, filteredHeaders, url) => {
				trimNonStandardHeaders(filteredHeaders);

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

	// todo: parse more request headers
	router.routes.set(
		/^\/xhr\//,
		genericForward(
			rewriter,
			async (_url, response) => response.body!,
			(resource) => routeBinary(resource)
		)
	);

	router.routes.set(
		/^\/manifest\//,
		genericForward(
			rewriter,
			async (url, response) =>
				modifyManifest(await response.text(), url, rewriter.config),
			(resource, url) => routeManifest(resource, url, rewriter.config),
			undefined,
			(headers, filteredHeaders) => {
				trimNonStandardHeaders(filteredHeaders);

				for (const header of integrityHeaders) {
					filteredHeaders.delete(header);
				}
			}
		)
	);
}
