import { walk } from 'css-tree';
import { generate, parse } from 'css-tree';

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
export function routeCSS(resource, url) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyCSS(data, url, 'stylesheet'),
			attributes,
		});
	}

	return routeURL('css', resource);
}

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

/**
 *
 * @param {string} url
 */
function preserveValue(url, value) {
	{
		const hashi = url.indexOf('#');
		if (hashi !== -1) {
			url = url.slice(0, hashi);
		}
	}

	return `${url}#${value}`;
}

/**
 *
 * @param {string} url
 */
function restoreValue(url) {
	const hashi = url.indexOf('#');

	if (hashi === -1) {
		throw new Error('Invalid value URL');
	}

	return url.slice(hashi + 1);
}

/**
 *
 * @param {string} script
 * @param {import('./StompURL.js').default} url
 * @param {string} context
 */
export function modifyCSS(script, url, context) {
	const tree = parse(script, { positions: true, context });
	let offset = 0;

	walk(tree, function (node) {
		if (node.type === 'Url')
			try {
				const resolved = new StompURL(
					new URL(node.value, url),
					url.codec,
					url.directory
				);

				let replace;

				const raw = script.slice(
					node.loc.start.offset - offset,
					node.loc.end.offset - offset
				);

				if (this.atrule?.name === 'import') {
					replace = {
						type: 'Url',
						value: preserveValue(routeCSS(resolved, url), raw),
					};
				} else {
					replace = {
						type: 'Url',
						value: preserveValue(routeBinary(resolved, url), raw),
					};
				}

				const generated = generate(replace);

				script =
					script.slice(0, node.loc.start.offset - offset) +
					generated +
					script.slice(node.loc.end.offset - offset);
				offset +=
					node.loc.end.offset - node.loc.start.offset - generated.length;
			} catch (error) {
				console.error(error);
			}
	});

	return script;
}

/**
 *
 * @param {string} script
 * @param {import('./StompURL.js').default} url
 * @param {string} context
 */
export function restoreCSS(script, url, context) {
	const comments = [];
	const tree = parse(script, {
		positions: true,
		context,
		onComment: (value, loc) => comments.push({ value, loc }),
	});
	let offset = 0;

	walk(tree, function (node) {
		if (node.type === 'Url') {
			const generated = restoreValue(node.value);

			script =
				script.slice(0, node.loc.start.offset - offset) +
				generated +
				script.slice(node.loc.end.offset - offset);
			offset += node.loc.end.offset - node.loc.start.offset - generated.length;
		}
	});

	return script;
}
