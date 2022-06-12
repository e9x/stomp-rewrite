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
 */
export function routeCSS(resource, url) {
	if (resource.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.pathname);

		return createDataURI({ mime, data: modifyCSS(data, url), attributes });
	}
	// if url.startsWith('data:')
	//   do logic with modifycss
	//   return new data url
	return routeURL('css', resource);
}

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

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

				if (this.atrule?.name === 'import') {
					replace = {
						type: 'Url',
						value: routeCSS(resolved, url),
					};
				} else {
					replace = {
						type: 'Url',
						value: routeBinary(resolved, url),
					};
				}

				const generated = `/*${JSON.stringify(
					script.slice(
						node.loc.start.offset - offset,
						node.loc.end.offset - offset
					)
				)}*/${generate(replace)}`;

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
		if (node.type === 'Url')
			for (const comment of comments) {
				// url begins as soon as comment ends
				if (node.loc.start.offset !== comment.loc.end.offset) {
					continue;
				}

				// remove comment
				comments.splice(comments.indexOf(comment), 1);

				script =
					script.slice(0, comment.loc.start.offset - offset) +
					script.slice(comment.loc.end.offset - offset);

				offset += comment.loc.end.offset - comment.loc.start.offset;

				const generated = JSON.parse(comment.value);

				script =
					script.slice(0, node.loc.start.offset - offset) +
					generated +
					script.slice(node.loc.end.offset - offset);
				offset +=
					node.loc.end.offset - node.loc.start.offset - generated.length;

				break;
			}
	});

	return script;
}
