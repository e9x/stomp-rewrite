import StompURL from './StompURL';
import { Config } from './config';
import { CLIENT_KEY } from './rewriteJS';
import {
	createDataURI,
	injectDocumentJS,
	parseDataURI,
	routeURL,
} from './routeURL';
import { escapeText } from 'entities';

export const ORIGINAL_ATTRIBUTE = `sO:`;

export function routeHTML(
	resource: StompURL,
	url: StompURL,
	config: Config,
	form = false
) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyHTML(data, url, config),
			attributes,
		});
	}

	return routeURL(form ? 'html:form' : 'html', resource);
}

export function modifyHTML(
	script: string,
	url: StompURL,
	config: Config
): string {
	// if(fragment) return '<script>document.currentScript.replaceWith(globalstomp.cloneIntoNewNode())
	const injectInit = `if(typeof globalThis.createClient!=='function'){document.write("Stomp client failed to inject.")}else{createClient(${JSON.stringify(
		config
	)}, ${JSON.stringify(
		url.codec.key
	)});if(!${CLIENT_KEY}.applied)${CLIENT_KEY}.apply();${CLIENT_KEY}.loadHTML(${escapeText(
		JSON.stringify(script)
	)})}`;

	return `<!DOCTYPE HTML><html><head><meta charset="utf-8" /></head><body><script src="${injectDocumentJS(
		url
	)}"></script><script>${injectInit}</script></body></html>`;
}

const REFRESH = /(;\s*?|^)url=(?:(['"])(((?!\2).)*)\2?|(.*);?)/i;

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
