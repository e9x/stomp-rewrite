import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';
import { parse } from 'meriyah';

import {
	AcornContext,
	AcornIterator,
	LazyGenerate,
	noResult,
} from './AcornUtil.js';
import { createDataURI, parseDataURI, routeURL } from './routeURL.js';
import StompURL from './StompURL.js';

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

export function routeJS(resource: StompURL, url: StompURL, module = false) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyJS(data, url, module),
			attributes,
		});
	}

	return routeURL('html', resource);
}

export function modifyJS(script: string, url: StompURL, module = false) {
	const lazy = new LazyGenerate();

	const tree = parse(script, {
		module,
		next: true,
		specDeviation: true,
		ranges: true,
	});

	for (const ctx of new AcornIterator(tree)) {
		switch (ctx.node.type) {
			case 'MemberExpression':
				console.log('member');
				lazy.replace(
					ctx,
					b.memberExpression(
						b.identifier('test'),
						noResult(
							b.memberExpression(
								ctx.node.object,
								ctx.node.property,
								ctx.node.computed
							)
						)
					)
				);
				break;
			case 'Literal':
				if (typeof ctx.node.value === 'string') {
					lazy.replace(ctx, b.literal('replace str literal'));
				}
				break;
			case 'Identifier':
				{
					console.log(
						'id',
						generate(ctx.parent?.node),
						ctx.node,
						ctx.parent?.node.type,
						ctx.node.type
					);
					const replaced = lazy.replace(ctx, b.identifier('replaced'));
					if (replaced instanceof AcornContext) {
						console.log(
							'new:',
							generate(replaced.parent?.node),
							generate(replaced.node),
							replaced.parentKey
						);
					}
				}
				break;
		}
	}

	return lazy.toString(script);
}

export function restoreJS(script: string, url: StompURL) {
	url.codec;
	return script;
}
