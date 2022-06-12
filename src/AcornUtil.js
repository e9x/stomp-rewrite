import { generate } from '@javascript-obfuscator/escodegen';

const symbolNoResult = Symbol();

export function noResult(node) {
	node[symbolNoResult] = true;
	return node;
}

export class AcornContext {
	constructor(node, parent, parentKey, stack, root = false) {
		this.node = node;
		this.stack = stack;
		this.entries = [];

		if (parent !== undefined) {
			this.parent = parent;
			this.parentKey = parentKey;
			this.attached = true;
		} else if (!root) {
			throw new TypeError('New parent isnt an instance of AcornContext.');
		} else {
			this.attached = false;
		}

		this.root = root;
	}
	// only used by array() and index()
	get parentObject() {
		return this.parent.node[this.parentKey];
	}
	get parentArray() {
		return Array.isArray(this.parentObject);
	}
	get parentIndex() {
		if (!this.parentArray) {
			throw new Error('Not an array');
		}

		return this.parentObject.indexOf(this.node);
	}
	detach() {
		if (this.root) {
			throw new RangeError('Cannot detach the root.');
		} else if (!this.attached) {
			throw new RangeError('Cannot detach a detached node.');
		}

		if (this.parentArray) {
			const place = this.parentObject.indexOf(this.node);
			if (place === -1) return false;
			this.parentObject.splice(place, 1);
		} else {
			delete this.parent.node[this.parentKey];
		}

		this.attached = false;

		return true;
	}
	// success = new AcornContext, failure = false
	replaceWith(node) {
		if (this.root) {
			throw new RangeError('Cannot replace the root.');
		} else if (!this.attached) {
			throw new RangeError('Cannot replace a detached node.');
		}

		if (this.parentArray) {
			const place = this.parentObject.indexOf(this.node);

			if (place === -1) {
				return false;
			}

			this.parentObject.splice(place, 1, node);
		} else {
			delete this.parent.node[this.parentKey];
			this.parent.node[this.parentKey] = node;
		}

		this.attached = false;

		const created = new AcornContext(
			node,
			this.parent,
			this.parentKey,
			this.stack
		);

		delete this.parent;

		this.removeDescendantsFromStack();
		noResult(node);
		this.stack.push(created);
		created.addEntriesToStack();

		return created;
	}
	addEntriesToStack() {
		const entries = [];

		for (const key in this.node) {
			const value = this.node[key];

			if (typeof value !== 'object' || value === null) {
				continue;
			}

			if (typeof value.type === 'string') {
				entries.push([key, value]);
			} else if (Array.isArray(value)) {
				for (const sv of value) {
					if (typeof sv !== 'object' || sv === null) {
						continue;
					}

					if (typeof sv.type === 'string') {
						entries.push([key, sv]);
					}
				}
			}
		}

		const start = this.stack.length - 1;
		let length = entries.length;

		for (const [key, node] of entries) {
			const ctx = new AcornContext(node, this, key, this.stack);
			this.stack[start + length--] = ctx;
			this.entries.push(ctx);
		}
	}
	removeDescendantsFromStack() {
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i];
			const stackI = this.stack.indexOf(entry);

			if (stackI !== -1) {
				this.stack.splice(stackI, 1);
			}

			entry.removeDescendantsFromStack();
		}
	}
}
export class AcornIterator {
	constructor(ast) {
		this.stack = [];
		this.stack.push(
			new AcornContext(ast, undefined, undefined, this.stack, true)
		);
	}
	next() {
		while (true) {
			const context = this.stack.pop();

			if (context === undefined) {
				return { value: undefined, done: true };
			}

			context.addEntriesToStack();

			if (context.node[symbolNoResult]) {
				continue;
			}

			return { value: context, done: false };
		}
	}
	[Symbol.iterator]() {
		return this;
	}
}

function inRange(range, test) {
	return range[0] >= test[1] !== range[1] > test[0];
}

export class LazyGenerate {
	constructor() {
		this.modifications = [];
	}
	toString(script) {
		let offset = 0;
		const generated = [];
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
				const oldLength = range[1] - range[0];
				const diff = mod.generated.length - oldLength;
				offset += diff;
			}
			const futureRange = [
				range[0] + offset,
				range[0] + offset + mod.generated.length,
			];
			for (const smod of generated) {
				if (smod === mod) {
					continue;
				}
				const srange = smod.range;
				const testFutureRange = [srange[0] + offset, srange[1] + offset];
				if (inRange(futureRange, testFutureRange)) {
					console.log('removed overlapping', generate(smod.replace));
					generated.splice(generated.indexOf(smod), 1);
				}
			}
		}
		return script;
	}
	replace(context, replace) {
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
				node: context.node,
				replace,
			});
		}
		return replaced;
	}
}
