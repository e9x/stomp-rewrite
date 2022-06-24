export class ElementContext {
	node: ParentNode;
	attached: boolean;
	root: boolean;
	stack: ElementContext[];
	parent?: ElementContext;
	constructor(
		node: ParentNode,
		parent: ElementContext | undefined,
		stack: ElementContext[],
		root = false
	) {
		this.node = node;
		this.stack = stack;

		if (parent instanceof ElementContext) {
			this.parent = parent;
			this.attached = true;
		} else if (!root) {
			throw new TypeError('New parent isnt an instance of ElementContext.');
		} else {
			this.attached = false;
		}

		this.root = root;
	}
	/**
	 * returns new context if this node is attached and in parent, false otherwise
	 */
	replaceWith(node: Element): ElementContext {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		this.parent!.node.replaceChild(node, this.node);
		this.attached = false;

		const created = new ElementContext(node, this.parent!, this.stack);
		delete this.parent;
		return created;
	}
	append(node: ParentNode) {
		this.node.append(node);
		return new ElementContext(node, this, this.stack);
	}
	/**
	 * appends this to a context
	 * returns true if successful, false otherwise
	 * exception if context isnt an instance of ElementContext
	 */
	attach(context: ElementContext) {
		if (this.attached)
			throw new RangeError(
				'Cannot attach an already attached node. Call .detach() first.'
			);

		this.parent = context;
		this.parent.append(this.node);
		this.attached = true;

		return true;
	}
	// returns true if this node was detached from the parent, false otherwise
	detach() {
		if (this.root) throw new RangeError('Cannot detach the root.');
		if (!this.attached)
			throw new RangeError(
				'Cannot detach an already detached node. Call .attach(context) first.'
			);
		this.parent!.node.removeChild(this.node);
		this.attached = false;
		delete this.parent;
		return true;
	}
}

export default class ElementIterator {
	stack: ElementContext[];
	constructor(node: ParentNode) {
		this.stack = [];
		this.stack.push(new ElementContext(node, undefined, this.stack, true));
	}
	next() {
		if (!this.stack.length) {
			return { value: undefined, done: true };
		}

		const context = this.stack.pop()!;

		// insert new contexts in reverse order
		// not cloning arrays then reversing in the interest of optimization
		const start = this.stack.length - 1;
		let length = context.node.childNodes.length;

		for (const node of context.node.childNodes) {
			this.stack[start + length--] = new ElementContext(
				<Element>node,
				context,
				this.stack
			);
		}

		return { value: context, done: false };
	}
	[Symbol.iterator](): Iterator<ElementContext> {
		return <Iterator<ElementContext>>this;
	}
}
