import { routeHTML } from './rewriteHTML.js';
import {
	createDataURI,
	parseDataURI,
	routeBinary,
	routeURL,
} from './routeURL.js';
import StompURL from './StompURL.js';

export function routeManifest(resource: StompURL, url: StompURL) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({ mime, data: modifyManifest(data, url), attributes });
	}

	return routeURL('manifest', resource);
}

declare interface Icon {
	sizes: string;
	src: string;
	type: string;
	purpose: ('monochrome' | 'maskable' | 'any')[];
}

declare interface Shortcut {
	name: string;
	short_name?: string;
	url: string;
	description?: string;
	icons?: Icon[];
}

declare interface ProtocolHandler {
	protocol: string;
	url: string;
}

declare interface RelatedApplication {
	platform:
		| 'chrome_web_store'
		| 'play'
		| 'itunes'
		| 'webapp'
		| 'windows'
		| 'f-droid'
		| 'amazon';
	url: string;
	id: string;
}

declare interface Screenshot {
	src: string;
	sizes: string;
	type: string;
	platform:
		| 'wide'
		| 'narrow'
		| 'android'
		| 'chromeos'
		| 'ios'
		| 'kaios'
		| 'macos'
		| 'windows'
		| 'xbox'
		| ' chrome_web_store'
		| 'play'
		| 'itunes'
		| 'microsoft-inbox'
		| 'microsoft-store';
	label: string;
}

declare interface Manifest {
	background_color?: string;
	categories?: string[];
	description?: string;
	dir?: 'auto' | 'ltr' | 'rtl';
	display?: string;
	display_override?:
		| 'fullscreen'
		| 'standalone'
		| 'minimal-ui'
		| 'browser'
		| 'window-controls-overlay';
	iarc_rating_id?: string;
	icons: Icon[];
	lang?: string;
	name: string;
	orientation?:
		| 'any'
		| 'natural'
		| 'landscape'
		| 'landscape-primary'
		| 'landscape-secondary'
		| 'portrait'
		| 'portrait-primary'
		| 'portrait-secondary';
	prefer_related_applications?: boolean;
	protocol_handlers?: ProtocolHandler[];
	related_applications?: RelatedApplication[];
	scope?: string;
	screenshots?: Screenshot[];
	short_name?: string;
	shortcuts?: Shortcut[];
	start_url?: string;
	theme_color?: string;
}

export function modifyManifest(script: string, url: StompURL) {
	const manifest: Manifest = JSON.parse(script);

	if (manifest.scope)
		manifest.scope = routeHTML(
			new StompURL(new URL(manifest.scope, url.toString()), url),
			url
		);

	if (manifest.start_url)
		manifest.start_url = routeHTML(
			new StompURL(new URL(manifest.start_url, url.toString()), url),
			url
		);

	if (manifest.shortcuts)
		for (const shortcut of manifest.shortcuts) {
			if (shortcut.icons)
				for (const icon of shortcut.icons)
					icon.src = routeBinary(
						new StompURL(new URL(icon.src, url.toString()), url)
					);

			shortcut.url = routeBinary(
				new StompURL(new URL(shortcut.url, url.toString()), url)
			);
		}

	if (manifest.icons)
		for (const icon of manifest.icons)
			icon.src = routeBinary(
				new StompURL(new URL(icon.src, url.toString()), url)
			);

	if (manifest.screenshots)
		for (const screenshot of manifest.screenshots)
			screenshot.src = routeBinary(
				new StompURL(new URL(screenshot.src, url.toString()), url)
			);

	if (manifest.protocol_handlers) delete manifest.protocol_handlers;

	if (manifest.related_applications)
		for (const app of manifest.related_applications) {
			app.url = routeBinary(
				new StompURL(new URL(app.url, url.toString()), url)
			);
		}

	return JSON.stringify(manifest);
}
