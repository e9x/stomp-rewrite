import { Node } from 'meriyah/dist/src/estree';

const symbolNoResult = Symbol();

export declare type SomeNode = Node & {
	range?: [number, number];
	[symbolNoResult]?: boolean;
};

export function noResult(node: SomeNode) {
	node[symbolNoResult] = true;
	return node;
}

export class AcornContext {
	root: boolean;
	attached: boolean;
	stack: AcornContext[];
	entries: AcornContext[];
	parent?: AcornContext;
	parentKey?: string | number;
	node: SomeNode;
	constructor(
		node: SomeNode,
		parent: AcornContext | undefined,
		parentKey: string | number | undefined,
		stack: AcornContext[],
		root = false
	) {
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
	get parentObject(): SomeNode[] {
		// @ts-ignore
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
		if (this.root) throw new RangeError('Cannot detach the root.');
		else if (!this.attached)
			throw new RangeError('Cannot detach a detached node.');

		if (this.parentArray) {
			const place = this.parentObject.indexOf(this.node);
			if (place == -1) return false;
			this.parentObject.splice(place, 1);
		} else {
			// @ts-ignore
			delete this.parent.node[this.parent_key]; // @ts-ignore
		}

		this.attached = false;

		return true;
	}
	// success = new AcornContext, failure = false
	replaceWith(node: SomeNode): AcornContext | boolean {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		if (this.parentArray) {
			const place = this.parentObject.indexOf(this.node);
			if (place === -1) return false;
			this.parentObject.splice(place, 1, node);
		} else {
			// @ts-ignore
			delete this.parent.node[this.parentKey];
			// @ts-ignore
			this.parent.node[this.parentKey] = node;
		}

		this.attached = false;
		// @ts-ignore

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
			// @ts-ignore
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

			const stack_i = this.stack.indexOf(entry);

			if (stack_i !== -1) {
				this.stack.splice(stack_i, 1);
			}

			entry.removeDescendantsFromStack();
		}
	}
}

export class AcornIterator implements Iterable<AcornContext> {
	stack: AcornContext[];
	constructor(ast: SomeNode) {
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
		return <Iterator<AcornContext>>this;
	}
}
