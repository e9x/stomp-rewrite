// import createHttpError from 'http-errors';

import BareClient from 'bare-client';

import { capitalizeHeaders } from '../headers.js';
import { modifyCSS, routeCSS } from '../rewriteCSS.js';
import { modifyHTML, modifyRefresh, routeHTML } from '../rewriteHTML.js';
import { modifyJS, routeJS } from '../rewriteJS.js';
import { modifyManifest, routeManifest } from '../rewriteManifest.js';
import { routeBinary } from '../routeURL.js';
import StompURL from '../StompURL.js';
import {
	AdditionalFilter,
	RouteTransform,
	filterNativeRequestHeaders,
	filterResponseHeaders,
} from './filterHeaders.js';

const BODY_ILLEGAL = ['GET', 'HEAD'];

type BodyTransform = (
	url: StompURL,
	response: Response,
	responseHeaders: Headers
) => Promise<BodyInit>;

async function genericForwardBind(
	transformBody: BodyTransform,
	transformRoute: RouteTransform,
	additionalRequestFilter: AdditionalFilter | undefined,
	additionalResponseFilter: AdditionalFilter | undefined,
	url: StompURL,
	serverRequest: Request,
	bare: BareClient
) {
	const requestHeaders = filterNativeRequestHeaders(
		serverRequest.headers,
		url,
		additionalRequestFilter
	);

	const response = await bare.fetch(url.toString(), {
		method: serverRequest.method,
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

	return new Response(await transformBody(url, response, responseHeaders), {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

function genericForward(
	transform: BodyTransform,
	route: RouteTransform,
	additionalRequestFilter?: AdditionalFilter,
	additionalResponseFilter?: AdditionalFilter
) {
	return function (url: StompURL, serverRequest: Request, bare: BareClient) {
		return genericForwardBind(
			transform,
			route,
			additionalRequestFilter,
			additionalResponseFilter,
			url,
			serverRequest,
			bare
		);
	};
}

const js = genericForward(
	async (url, response) => modifyJS(await response.text(), url),
	(resource, url) => routeJS(resource, url)
);
const mjs = genericForward(
	async (url, response) => modifyJS(await response.text(), url, true),
	(resource, url) => routeJS(resource, url, true)
);
const css = genericForward(
	async (url, response) => modifyCSS(await response.text(), url),
	(resource, url) => routeCSS(resource, url)
);
const html = genericForward(
	async (url, response, responseHeaders) => {
		if (responseHeaders.get('content-type') === 'application/pdf') {
			return response.body!;
		}

		return modifyHTML(await response.text(), url);
	},
	(resource, url) => routeHTML(resource, url),
	(headers, filteredHeaders, url) => {
		if (headers.has('refresh')) {
			filteredHeaders.set(
				'refresh',
				modifyRefresh(headers.get('refresh')!, url)
			);
		}
	}
);
const manifest = genericForward(
	async (url, response) => modifyManifest(await response.text(), url),
	(resource, url) => routeManifest(resource, url)
);
const binary = genericForward(
	async (_url, response) => response.body!,
	resource => routeBinary(resource)
);

const rewrites: {
	[key: string]: (
		url: StompURL,
		serverRequest: Request,
		bare: BareClient
	) => Promise<Response>;
} = {
	js,
	mjs,
	css,
	html,
	manifest,
	binary,
};

export default rewrites;
