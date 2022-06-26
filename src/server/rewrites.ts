// import createHttpError from 'http-errors';
import StompURL from '../StompURL';
import { Config } from '../config';
import { capitalizeHeaders, trimNonStandardHeaders } from '../headers';
import { modifyCSS, routeCSS } from '../rewriteCSS';
import { modifyHTML, modifyRefresh, routeHTML } from '../rewriteHTML';
import { modifyJS, routeJS } from '../rewriteJS';
import { modifyManifest, routeManifest } from '../rewriteManifest';
import { routeBinary } from '../routeURL';
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
	responseHeaders: Headers,
	config: Config
) => Promise<BodyInit>;

async function genericForwardBind(
	transformBody: BodyTransform,
	transformRoute: RouteTransform,
	additionalRequestFilter: AdditionalFilter | undefined,
	additionalResponseFilter: AdditionalFilter | undefined,
	url: StompURL,
	serverRequest: Request,
	bare: BareClient,
	config: Config
) {
	const requestHeaders = filterNativeRequestHeaders(
		serverRequest.headers,
		url,
		config,
		additionalRequestFilter
	);

	const response = await bare.fetch(url.toString(), {
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
		config,
		transformRoute,
		additionalResponseFilter
	);

	return new Response(
		statusEmpty.includes(+response.status)
			? undefined
			: await transformBody(url, response, responseHeaders, config),
		{
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		}
	);
}

function genericForward(
	transform: BodyTransform,
	route: RouteTransform,
	additionalRequestFilter?: AdditionalFilter,
	additionalResponseFilter?: AdditionalFilter
) {
	return function (
		url: StompURL,
		serverRequest: Request,
		bare: BareClient,
		config: Config
	) {
		return genericForwardBind(
			transform,
			route,
			additionalRequestFilter,
			additionalResponseFilter,
			url,
			serverRequest,
			bare,
			config
		);
	};
}

const js = genericForward(
	async (url, response) => modifyJS(await response.text(), url),
	(resource, url) => routeJS(resource, url),
	undefined,
	(headers, filteredHeaders) => {
		for (const header of integrityHeaders) {
			filteredHeaders.delete(header);
		}
	}
);
const mjs = genericForward(
	async (url, response) => modifyJS(await response.text(), url, true),
	(resource, url) => routeJS(resource, url, true),
	undefined,
	(headers, filteredHeaders) => {
		trimNonStandardHeaders(filteredHeaders);

		for (const header of integrityHeaders) {
			filteredHeaders.delete(header);
		}
	}
);
const css = genericForward(
	async (url, response) => modifyCSS(await response.text(), url),
	(resource, url) => routeCSS(resource, url),
	undefined,
	(headers, filteredHeaders) => {
		trimNonStandardHeaders(filteredHeaders);

		for (const header of integrityHeaders) {
			filteredHeaders.delete(header);
		}
	}
);
const htmlMimes = ['image/svg+xml', 'text/html', ''];

export function getMime(contentType: string): string {
	return contentType.split(';')[0];
}

const html = genericForward(
	async (url, response, responseHeaders, config) => {
		if (
			htmlMimes.includes(getMime(responseHeaders.get('content-type') || ''))
		) {
			return modifyHTML(await response.text(), url, config);
		}

		return response.body!;
	},
	(resource, url, config) => routeHTML(resource, url, config),
	(headers, filteredHeaders, url, config) => {
		trimNonStandardHeaders(filteredHeaders);

		if (headers.has('refresh')) {
			filteredHeaders.set(
				'refresh',
				modifyRefresh(headers.get('refresh')!, url, config)
			);
		}

		for (const header of integrityHeaders) {
			filteredHeaders.delete(header);
		}
	}
);
const manifest = genericForward(
	async (url, response, _responseHeaders, config) =>
		modifyManifest(await response.text(), url, config),
	(resource, url, config) => routeManifest(resource, url, config),
	undefined,
	(headers, filteredHeaders) => {
		trimNonStandardHeaders(filteredHeaders);

		for (const header of integrityHeaders) {
			filteredHeaders.delete(header);
		}
	}
);
const binary = genericForward(
	async (_url, response) => response.body!,
	resource => routeBinary(resource),
	undefined,
	(headers, filteredHeaders) => {
		trimNonStandardHeaders(filteredHeaders);
	}
);
// todo: parse more request headers
const xhr = genericForward(
	async (_url, response) => response.body!,
	resource => routeBinary(resource)
);

const rewrites: {
	[key: string]: (
		url: StompURL,
		serverRequest: Request,
		bare: BareClient,
		config: Config
	) => Promise<Response>;
} = {
	js,
	mjs,
	css,
	html,
	manifest,
	binary,
	xhr,
};

export default rewrites;
