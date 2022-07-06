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
	const inject = `if (typeof globalThis.createClient !== 'function') {
	document.write("Stomp bundle did not load. See devtools output for more information.");
} else {
	if (!(${JSON.stringify(CLIENT_KEY)} in globalThis))
		createClient(${JSON.stringify(config)}, ${JSON.stringify(url.codec.key)});

	if (!${CLIENT_KEY}.applied) try {
		${CLIENT_KEY}.apply();
	} catch(error) {
		document.write("Failure applying Stomp hooks. See devtools output for more information.");
		throw error;
	}

	try {
		${CLIENT_KEY}.loadHTML(${escapeText(JSON.stringify(script))});
	} catch(error) {
		document.write("Failure loading Stomp HTML. See devtools output for more information.");
		throw error;
	}
}`;

	return `<!DOCTYPE HTML><html><head><meta charset="utf-8" /></head><body><script src="${injectDocumentJS(
		url
	)}"></script><script>${inject}</script></body></html>`;
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
