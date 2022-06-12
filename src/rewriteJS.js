import { parse } from 'meriyah';
import { AcornIterator, AcornContext, LazyGenerate, noResult } from './AcornUtil.js';
import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

/**
 * 
 * @param {string} script
 * @param {import('./StompURL.js').default} url 
 * @param {boolean} module
 */
export function modifyJS(script, url, module) {
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

/**
 * 
 * @param {string} script
 * @param {import('./StompURL.js').default} url
 */
export function restoreJS(script, url) {
	url.codec;
	return script;
}
