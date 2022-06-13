// import createHttpError from 'http-errors';

import BareClient from 'bare-client';

import { modifyCSS } from '../rewriteCSS.js';
import { modifyHTML } from '../rewriteHTML.js';
import { modifyJS } from '../rewriteJS.js';
import { modifyManifest } from '../rewriteManifest.js';
import StompURL from '../StompURL.js';
import { capitalizeHeaders } from './headers.js';

// native as in the browser requesting an image from /binary/ or document from /html/
function filterNativeRequestHeaders(headers: Headers): Headers {
	const filteredHeaders = new Headers(headers);
	return filteredHeaders;
}

function filterResponseHeaders(headers: Headers): Headers {
	const filteredHeaders = new Headers(headers);
	return filteredHeaders;
}

const BODY_ILLEGAL = ['GET', 'HEAD'];

type genericForwardTransform = (
	url: StompURL,
	response: Response
) => Promise<BodyInit>;

async function genericForwardBind(
	transform: genericForwardTransform,
	url: StompURL,
	serverRequest: Request,
	bare: BareClient
) {
	const requestHeaders = filterNativeRequestHeaders(serverRequest.headers);

	const response = await bare.fetch(url.toString(), {
		method: serverRequest.method,
		body:
			(!BODY_ILLEGAL.includes(serverRequest.method) &&
				(await serverRequest.blob())) ||
			undefined,
		headers: capitalizeHeaders(requestHeaders),
	});

	const responseHeaders = filterResponseHeaders(response.headers);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

function genericForward(callback: genericForwardTransform) {
	return function (url: StompURL, serverRequest: Request, bare: BareClient) {
		return genericForwardBind(callback, url, serverRequest, bare);
	};
}

const js = genericForward(async (url, response) =>
	modifyJS(await response.text(), url)
);
const css = genericForward(async (url, response) =>
	modifyCSS(await response.text(), url)
);
const html = genericForward(async (url, response) =>
	modifyHTML(await response.text(), url)
);
const manifest = genericForward(async (url, response) =>
	modifyManifest(await response.text(), url)
);
const binary = genericForward(async (_url, response) => response.body!);

const rewrites: {
	[key: string]: (
		url: StompURL,
		serverRequest: Request,
		bare: BareClient
	) => Promise<Response>;
} = {
	js,
	css,
	html,
	manifest,
	binary,
};

export default rewrites;
