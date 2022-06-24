import StompURL from './StompURL';
import { Config } from './config';
import Parse5Iterator from './parse5Util';
import { routeCSS } from './rewriteCSS';
import { routeJS } from './rewriteJS';
import {
	createDataURI,
	injectDocumentJS,
	parseDataURI,
	routeURL,
} from './routeURL';
import { parse, parseFragment, serialize } from 'parse5';
import { Element, TextNode } from 'parse5/dist/tree-adapters/default';

export function routeHTML(resource: StompURL, url: StompURL, config: Config) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyHTML(data, url, config),
			attributes,
		});
	}

	return routeURL('html', resource);
}

const essentialNodes = [
	'#documentType',
	'#document',
	'#text',
	'html',
	'head',
	'body',
];

export function modifyHTML(
	script: string,
	url: StompURL,
	config: Config,
	fragment = false
): string {
	const tree: Element = fragment
		? <Element>parseFragment(script)
		: <Element>(<unknown>parse(script));

	const head: Element[] = [
		{
			nodeName: 'script',
			tagName: 'script',
			parentNode: null,
			childNodes: [],
			// @ts-ignore
			namespaceURI: 'http://www.w3.org/1999/xhtml',
			attrs: [
				{
					name: 'src',
					value: injectDocumentJS(url),
				},
				{
					name: 'data-is-tomp',
					value: 'true',
				},
			],
		},
		{
			nodeName: 'script',
			tagName: 'script',
			parentNode: null,
			// @ts-ignore
			namespaceURI: 'http://www.w3.org/1999/xhtml',
			childNodes: [
				<TextNode>{
					nodeName: '#text',
					value: `if(typeof createClient!=='function')document.write("Stomp client failed to inject.");createClient(${JSON.stringify(
						config
					)}, ${JSON.stringify(url.codec.key)})`,
				},
			],
			attrs: [
				{
					name: 'data-is-tomp',
					value: 'true',
				},
			],
		},
	];

	let insertedScript = false;

	for (const ctx of new Parse5Iterator(tree)) {
		if (!ctx.node.attrs) {
			// #text node
			continue;
		}

		/*const element = new TOMPElementParse5(ctx);

		if (wrap) {
			this.tomp.elements.wrap(element, url, persist);
		} else {
			this.tomp.elements.unwrap(element, url, persist);
		}*/

		// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
		// on the first non-essential node (not html,head,or body), insert the client script before it
		if (
			!fragment &&
			// wrap &&
			// !element.detached &&
			!insertedScript &&
			!essentialNodes.includes(ctx.node.nodeName)
		) {
			insertedScript = true;
			for (const node of head) {
				ctx.insertBefore(node);
			}
		}

		// element.sync();
	}

	// just enough to start developing
	return serialize(tree)
		.replace(
			/<script defer="(.*?)" src="(\/[^"]+)"><\/script>/g,
			(match, defer, src) =>
				`<script defer="${defer}" src="${routeJS(
					new StompURL(new URL(src, url.toString()), url),
					url
				)}"></script>`
		)
		.replace(
			/<link href="(\/[^"]+)" rel="stylesheet">/g,
			(match, href) =>
				`<link href="${routeCSS(
					new StompURL(new URL(href, url.toString()), url),
					url
				)}" rel="stylesheet">`
		);
}

export function restoreHTML(
	script: string,
	url: StompURL,
	fragment = false
): string {
	const tree: Element = fragment
		? <Element>parseFragment(script)
		: <Element>(<unknown>parse(script));

	return serialize(tree);
}

const REFRESH = /([; ]|^)url=(?:(['"])(((?!\2).)*)\2?|(.*);)/i;

// excellent resource
// https://web.archive.org/web/20210514140514/https://www.otsukare.info/2015/03/26/refresh-http-header
export function modifyRefresh(script: string, url: StompURL, config: Config) {
	return script.replace(
		REFRESH,
		(_match, pre, _1, resource1, _3, resource2) => {
			const resource: string = resource1 || resource2;

			return `${pre}url=${routeHTML(
				new StompURL(new URL(resource, url.toString()), url),
				url,
				config
			)}`;
		}
	);
}
