import { NodeKind } from 'ast-types/gen/kinds';
import { Node } from 'meriyah/dist/src/estree';

export declare type SomeNode = (Node | NodeKind) & { range?: [number, number] };

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
		root: boolean
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
	get parent_array() {
		return Array.isArray(this.parentObject);
	}
	get parentIndex() {
		if (!this.parent_array) {
			throw new Error('Not an array');
		}

		return this.parentObject.indexOf(this.node);
	}
	detach() {
		if (this.root) throw new RangeError('Cannot detach the root.');
		else if (!this.attached)
			throw new RangeError('Cannot detach a detached node.');

		if (this.parent_array) {
			let place = this.parentObject.indexOf(this.node);
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
	replaceWith(node: SomeNode) {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		if (this.parent_array) {
			let place = this.parentObject.indexOf(this.node);
			if (place == -1) return false;
			this.parentObject.splice(place, 1, node);
		} else {
			// @ts-ignore
			delete this.parent.node[this.parent_key];
			// @ts-ignore
			this.parent.node[this.parent_key] = node;
		}

		this.attached = false;
		// @ts-ignore

		const created = new AcornContext(
			node,
			this.parent,
			this.parentKey,
			this.stack,
			false
		);

		delete this.parent;

		return created;
	}
	addDescendantsToStack() {
		const entries = [];

		for (let key in this.node) {
			// @ts-ignore
			const value = this.node[key];

			if (typeof value !== 'object' || value === null) {
				continue;
			}

			if (typeof value.type === 'string') {
				entries.push([key, value]);
			} else if (Array.isArray(value)) {
				for (let sv of value) {
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

		for (let [key, node] of entries) {
			const ent = new AcornContext(node, this, key, this.stack, false);
			this.stack[start + length--] = ent;
			this.entries.push(ent);
		}
	}
	removeDescendantsFromStack() {
		const i = this.stack.indexOf(this);

		if (i != -1) this.stack.splice(i, 1);

		for (let entry of this.entries) {
			entry.removeDescendantsFromStack();
		}
	}
}

export default class AcornIterator implements Iterable<AcornContext> {
	stack: AcornContext[];
	constructor(ast: SomeNode) {
		this.stack = [];
		this.stack.push(
			new AcornContext(ast, undefined, undefined, this.stack, true)
		);
	}
	next() {
		const context = this.stack.pop();

		if (context === undefined) {
			return { value: undefined, done: true };
		}

		context.addDescendantsToStack();

		return { value: context, done: false };
	}
	[Symbol.iterator]() {
		return <Iterator<AcornContext>>this;
	}
}
