import StompURL from './StompURL.js';
import { parse } from 'meriyah';
import AcornIterator, { AcornContext, SomeNode } from './AcornIterator.js';
import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';
import { ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds';

function in_range(range: [number, number], test: [number, number]) {
	console.log(range, test);
	console.log(visual_range(range));
	console.log(visual_range(test));
	const result = range[0] >= test[1] != range[1] > test[0];
	console.log(result);
	return result;
}

function visual_range(range: [number, number]) {
	let output = '';
	const rows = 50;
	for (let i = 0; i < rows; i++) {
		output +=
			(i >= range[0] && i <= range[1]) || (i <= range[1] && i >= range[0])
				? '|'
				: '.';
	}
	return output;
}

interface LocatedNode {
	range: [number, number];
}

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

		for (let mod of this.modifications) {
			generated.push({
				range: mod.node.range,
				replace: mod.replace,
				generated: generate(mod.replace),
			});
		}

		generated.sort((a, b) => b.generated.length - a.generated.length);

		for (let mod of generated) {
			console.log(mod.generated.length);
		}

		for (let i = 0; i < generated.length; i++) {
			const mod = generated[i];
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

			const future_range: [number, number] = [
				range[0] + offset,
				range[0] + offset + mod.generated.length,
			];

			console.log('future:', future_range);

			// this.modifications.sort((a, b) => a.

			for (let s = i + 1; s < generated.length; i++) {
				const smod = generated[i];

				console.log(smod === mod);

				const srange = smod.range;

				const future_srange: [number, number] = [
					srange[0] + offset,
					srange[1] + offset,
				];

				console.log('future srange:', future_srange);

				console.log('START:');

				if (in_range(future_range, future_srange)) {
					generated.splice(generated.indexOf(smod), 1);
					console.log('removed smaller', generate(smod.replace));
				}
			}
		}

		return script;
	}
	replace(context: AcornContext, replace: SomeNode) {
		// node might be a generated child that wasnt ran through lazy.replace
		// the parent node should have

		// lazy.replace(b.memberExpression(b.literal('no range associated with this child node'), ...))

		if (context.node.range) {
			replace.range = context.node.range;

			this.modifications.push({
				node: <LocatedNode>context.node,
				replace,
			});
		}

		return context.replaceWith(replace);
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

	for (let ctx of new AcornIterator(tree)) {
		switch (ctx.node.type) {
			case 'MemberExpression':
				console.log('member', ctx.node);
				lazy.replace(
					ctx,
					b.memberExpression(
						b.identifier('test'),
						b.memberExpression(
							<ExpressionKind>ctx.node.object,
							<IdentifierKind | ExpressionKind>ctx.node.property,
							ctx.node.computed
						)
					)
				);

				break;
			case 'Identifier':
				console.log('id');
				if (ctx.parent?.node.type === 'MemberExpression') {
					lazy.replace(ctx, b.identifier('replaced'));
				}
				break;
		}
	}

	return lazy.toString(script);
}

export function restoreJS(script: string, url: StompURL) {}
