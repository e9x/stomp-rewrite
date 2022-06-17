import { Element } from 'parse5/dist/tree-adapters/default';

export class Parse5Context {
	node: Element;
	attached: boolean;
	root: boolean;
	stack: Parse5Context[];
	parent?: Parse5Context;
	constructor(
		node: Element,
		parent: Parse5Context | undefined,
		stack: Parse5Context[],
		root = false
	) {
		this.node = node;
		this.stack = stack;

		if (parent instanceof Parse5Context) {
			this.parent = parent;
			this.attached = true;
		} else if (!root) {
			throw new TypeError('New parent isnt an instance of Parse5Context.');
		} else {
			this.attached = false;
		}

		this.root = root;
	}
	get type() {
		return this.node.nodeName;
	}
	insertBefore(node: Element, offset = 0): Parse5Context | false {
		if (this.root) throw new RangeError('Cannot insert before the root.');
		else if (!this.attached)
			throw new RangeError('Cannot insert before a detached node.');

		const place = this.parent!.node.childNodes.indexOf(this.node);
		if (place === -1) return false;
		this.parent!.node.childNodes.splice(place + offset, 0, node);
		return new Parse5Context(node, this.parent!, this.stack);
	}
	// returns new context if this node is attached and in parent, false otherwise
	insertAfter(node: Element) {
		return this.insertBefore(node, 1);
	}
	// returns new context if this node is attached and in parent, false otherwise
	replaceWith(node: Element): Parse5Context | false {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		const place = this.parent!.node.childNodes.indexOf(this.node);
		if (place === -1) return false;
		this.parent!.node.childNodes.splice(place, 1, node);
		this.attached = false;

		const created = new Parse5Context(node, this.parent!, this.stack);
		delete this.parent;
		return created;
	}
	append(node: Element) {
		this.node.childNodes.push(node);
		return new Parse5Context(node, this, this.stack);
	}
	// appends this to a context
	// returns true if successful, false otherwise
	// exception if context isnt an instance of Parse5Context
	attach(context: Parse5Context) {
		if (this.attached)
			throw new RangeError(
				'Cannot attach an already attached node. Call .detach() first.'
			);

		this.parent = context;
		this.parent.append(this.node);
		return true;
	}
	// returns true if this node was detached from the parent, false otherwise
	detach() {
		if (this.root) throw new RangeError('Cannot detach the root.');
		if (!this.attached)
			throw new RangeError(
				'Cannot detach an already detached node. Call .attach(context) first.'
			);
		const place = this.parent!.node.childNodes.indexOf(this.node);
		if (place === -1) return false;
		this.parent!.node.childNodes.splice(place, 1);
		this.attached = false;
		delete this.parent;
		return true;
	}
}

export default class Parse5Iterator {
	stack: Parse5Context[];
	constructor(ast: Element) {
		this.stack = [];
		this.stack.push(new Parse5Context(ast, undefined, this.stack, true));
	}
	next() {
		if (!this.stack.length) {
			return { value: undefined, done: true };
		}

		const context = this.stack.pop()!;

		if (context.node.childNodes) {
			// insert new contexts in reverse order
			// not cloning arrays then reversing in the interest of optimization
			const start = this.stack.length - 1;
			let length = context.node.childNodes.length;

			for (const node of context.node.childNodes) {
				if (!((<Element>node).childNodes instanceof Array)) {
					continue;
				}

				this.stack[start + length--] = new Parse5Context(
					<Element>node,
					context,
					this.stack
				);
			}
		}

		return { value: context, done: false };
	}
	[Symbol.iterator]() {
		return this;
	}
}
