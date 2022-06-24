import StompURL from './StompURL';
import { Config } from './config';
import Parse5Iterator from './parse5Util';
import { routeCSS } from './rewriteCSS';
import { CLIENT_KEY, routeJS } from './rewriteJS';
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
	return `<!DOCTYPE HTML><html><head><meta charset="utf-8" /></head><body><script src="${injectDocumentJS(
		url
	)}"></script><script>/*<!--*/if(typeof globalThis.createClient!=='function'){document.write("Stomp client failed to inject.")}else{createClient(${JSON.stringify(
		config
	)}, ${JSON.stringify(url.codec.key)});globalThis[${JSON.stringify(
		CLIENT_KEY
	)}].loadHTML(${JSON.stringify(script)});globalThis[${JSON.stringify(
		CLIENT_KEY
	)}].apply()}/*-->*/</script></body></html>`;
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
