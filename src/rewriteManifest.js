import { routeHTML } from './rewriteHTML.js';
import {
	createDataURI,
	parseDataURI,
	routeBinary,
	routeURL,
} from './routeURL.js';
import StompURL from './StompURL.js';

/**
 *
 * @param {import('./StompURL.js').default} resource
 * @param {import('./StompURL.js').default} url
 */
export function routeManifest(resource, url) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.pathname);
		return createDataURI({ mime, data: modifyManifest(data, url), attributes });
	}

	return routeURL('manifest', resource);
}

/**
 *
 * @param {string} script
 * @param {import('./StompURL.js').default} url
 */
export function modifyManifest(script, url) {
	let manifest;

	try {
		manifest = JSON.parse(script);
	} catch (error) {
		console.error(error);
		return script;
	}

	if ('scope' in manifest)
		manifest.scope = routeHTML(new StompURL(new URL(manifest.scope, url), url));

	if ('start_url' in manifest)
		manifest.start_url = routeHTML(
			new StompURL(new URL(manifest.start_url, url), url)
		);

	if ('shortcuts' in manifest)
		for (const shortcut of manifest.shortcuts) {
			if ('icons' in shortcut)
				for (const icon of shortcut.icons)
					icon.src = routeBinary(new StompURL(new URL(icon.src, url), url));

			shortcut.url = routeBinary(new StompURL(new URL(shortcut.url, url), url));
		}

	if ('icons' in manifest)
		for (const icon of manifest.icons)
			icon.src = routeBinary(new StompURL(new URL(icon.src, url), url));

	if ('screenshots' in manifest)
		for (const screenshot of manifest.screenshots)
			screenshot.src = routeBinary(
				new StompURL(new URL(screenshot.src, url), url)
			);

	if ('protocol_handlers' in manifest) delete manifest.protocol_handlers;

	if ('related_applications' in manifest)
		for (const app of manifest.related_applications) {
			app.url = routeBinary(new StompURL(new URL(app.url, url), url));
		}

	return JSON.stringify(manifest);
}
