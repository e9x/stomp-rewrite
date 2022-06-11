import StompURL from './StompURL.js';
import { parse } from 'meriyah';
import {
	AcornIterator,
	AcornContext,
	noResult,
	SomeNode,
} from './AcornUtil.js';
import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';
import { ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds';

function inRange(range: [number, number], test: [number, number]) {
	return range[0] >= test[1] != range[1] > test[0];
}

declare type LocatedNode = SomeNode & {
	range: [number, number];
};

class LazyGenerate {
	modifications: { node: LocatedNode; replace: SomeNode }[];
	constructor() {
		this.modifications = [];
	}
	toString(script: string) {
		let offset = 0;

		const generated: {
			range: [number, number];
			replace: SomeNode;
			generated: string;
		}[] = [];

		for (const mod of this.modifications) {
			generated.push({
				range: mod.node.range,
				replace: mod.replace,
				generated: generate(mod.replace),
			});
		}

		generated.sort(
			(a, b) => a.range[0] - b.range[0] || a.range[1] - b.range[1]
		);

		for (const mod of generated) {
			const range = mod.range;

			script =
				script.slice(0, range[0] + offset) +
				mod.generated +
				script.slice(offset + range[1]);

			{
				const old_length = range[1] - range[0];
				const diff = mod.generated.length - old_length;
				offset += diff;
			}

			const futureRange: [number, number] = [
				range[0] + offset,
				range[0] + offset + mod.generated.length,
			];

			for (const smod of generated) {
				if (smod === mod) {
					continue;
				}

				const srange = smod.range;

				const testFutureRange: [number, number] = [
					srange[0] + offset,
					srange[1] + offset,
				];

				if (inRange(futureRange, testFutureRange)) {
					console.log('removed overlapping', generate(smod.replace));
					generated.splice(generated.indexOf(smod), 1);
				}
			}
		}

		return script;
	}
	replace(context: AcornContext, replace: SomeNode) {
		const replaced = context.replaceWith(replace);

		if (replaced === false) {
			console.log(
				'failed to replace',
				generate(context.node),
				'with',
				generate(replace)
			);
			return false;
		}

		if (context.node.range) {
			for (const mod of this.modifications) {
				if (mod.replace === context.node) {
					return replaced;
				}
			}

			replace.range = context.node.range;

			this.modifications.push({
				node: <LocatedNode>context.node,
				replace,
			});
		}

		return replaced;
	}
}

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

export function modifyJS(script: string, url: StompURL, module: boolean) {
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
								<ExpressionKind>ctx.node.object,
								<IdentifierKind | ExpressionKind>ctx.node.property,
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
