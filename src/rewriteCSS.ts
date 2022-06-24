import StompURL from './StompURL';
import { createDataURI, parseDataURI, routeBinary, routeURL } from './routeURL';
import { generate, parse, StringNode, Url, walk } from 'css-tree';

export function routeCSS(resource: StompURL, url: StompURL) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyCSS(data, url),
			attributes,
		});
	}

	return routeURL('css', resource);
}

function preserveValue(url: string, value: string) {
	{
		const hashi = url.indexOf('#');
		if (hashi !== -1) {
			url = url.slice(0, hashi);
		}
	}

	return `${url}#${value}`;
}

function restoreValue(url: string) {
	const hashi = url.indexOf('#');

	if (hashi === -1) {
		throw new Error('Invalid value URL');
	}

	return url.slice(hashi + 1);
}

export function modifyCSS(
	script: string,
	url: StompURL,
	context = 'stylesheet'
) {
	const tree = parse(script, { positions: true, context });
	let offset = 0;

	walk(tree, function (node) {
		if (node.type === 'Url')
			try {
				// @ts-ignore
				const resolved = new StompURL(new URL(node.value, url), url);

				let replace: Url;

				const raw = script.slice(
					node.loc!.start.offset - offset,
					node.loc!.end.offset - offset
				);

				if (this.atrule?.name === 'import') {
					replace = {
						type: 'Url',
						value: <StringNode>(
							(<unknown>preserveValue(routeCSS(resolved, url), raw))
						),
					};
				} else {
					replace = {
						type: 'Url',
						value: <StringNode>(
							(<unknown>preserveValue(routeBinary(resolved), raw))
						),
					};
				}

				const generated = generate(replace);

				script =
					script.slice(0, node.loc!.start.offset - offset) +
					generated +
					script.slice(node.loc!.end.offset - offset);
				offset +=
					node.loc!.end.offset - node.loc!.start.offset - generated.length;
			} catch (error) {
				console.error(error);
			}
	});

	return script;
}

export function restoreCSS(script: string, url: StompURL, context: string) {
	const tree = parse(script, {
		positions: true,
		context,
	});
	let offset = 0;

	walk(tree, function (node) {
		if (node.type === 'Url') {
			// @ts-ignore
			const generated = restoreValue(node.value);

			script =
				script.slice(0, node.loc!.start.offset - offset) +
				generated +
				script.slice(node.loc!.end.offset - offset);
			offset +=
				node.loc!.end.offset - node.loc!.start.offset - generated.length;
		}
	});

	return script;
}
