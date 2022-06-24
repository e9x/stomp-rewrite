import Client from '../Client';
import Module from '../Module';
import ProxyModule, {
	applyDescriptors,
	invokeGlobal,
} from '../baseModules/Proxy';

const ORIGINAL_ATTRIBUTE = `sO:`;

class CustomElement extends Element {
	getOriginalAttribute(this: Element, attribute: string): string | undefined {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		if (this.hasAttribute(og)) {
			return this.getAttribute(og)!;
		}
	}
	setOriginalAttribute(this: Element, attribute: string, value: string) {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		this.setAttribute(og, value);
	}
}

const nativeNode = {};
const nativeElement = Object.create(nativeNode);

applyDescriptors(nativeNode, Node.prototype);
applyDescriptors(nativeElement, Element.prototype);

Reflect.setPrototypeOf(CustomElement.prototype, nativeElement);

/*
do it statefully

// set element prototype when working on it

useAttributes(element => {
	if(element.hasAttribute('href') && element.hasAttribute('rel')) {
		
	}
}, ['rel', 'href']);

determining element.src:
	element.setAttribute('src', RAW SRC);
	const src = element.src;
	element.setAttribute('src', PROXIED SRC);
	can work for every element that has an effect at the end of the stack
	end of stake being when setTimeout(() => {}) is executed

*/

type ElementCtor = { new (): HTMLElement };

type PropData = [attribute: string, get: (element: CustomElement) => string];

/*
 * Sets the prototype of an element while this script is working with it. This is to ensure we are only accessing the native functions and not any traps/shims.
 * The node is in a detached state while being worked with, to avoid making many requests as attributes are set.
 */
function prototypeElement<T>(
	element: Element,
	// recast the element type to reflect changes
	callback: (element: CustomElement) => T
): T {
	const prototype = Reflect.getPrototypeOf(element);
	Reflect.setPrototypeOf(element, CustomElement.prototype);

	const parent = element.parentElement;
	const sibling = element.nextSibling;
	element.remove();

	let result: any[] = [];

	try {
		result = [callback(<CustomElement>element)];
	} catch (error) {
		result = [undefined, error];
	}

	if (sibling) {
		parent?.insertBefore(element, sibling);
	} else {
		parent?.append(element);
	}

	Reflect.setPrototypeOf(element, prototype);

	if (result.length === 2) {
		throw result[1];
	}

	return result[0];
}

/**
 * Provides a framework for hooking elements
 */
export default class DOMModule extends Module {
	attributeHooks: [
		type: string[],
		callback: (element: CustomElement) => void,
		attributes: string[],
		ctors: ElementCtor[],
		properties: {
			[property: string]: [
				attribute: string,
				get: (element: CustomElement) => string
			];
		}
	][];
	previousAttributes: WeakMap<Element, Map<string, string>>;
	trackAttributes: Map<string, Set<string>>;

	constructor(client: Client) {
		super(client);

		this.attributeHooks = [];
		this.previousAttributes = new WeakMap();
		this.trackAttributes = new Map();
	}
	private testHooks(element: CustomElement, attribute: string) {
		const value = element.getAttribute(attribute);

		if (!this.previousAttributes.has(element)) {
			this.previousAttributes.set(element, new Map());
		}

		const pA = this.previousAttributes.get(element)!;

		if (pA.get(attribute) !== value) {
			this.updateAttributeHooks(element, attribute);
			// value might be undefined?
			pA.set(attribute, element.getAttribute(attribute)!);
		}
	}
	useAttributes(
		elements: string[],
		callback: (element: CustomElement) => void,
		attributes: string[],
		ctors: ElementCtor[] = [],
		properties: { [property: string]: PropData } = {}
	) {
		for (const element of elements) {
			if (!this.trackAttributes.has(element)) {
				this.trackAttributes.set(element, new Set());
			}

			for (const attribute of attributes) {
				this.trackAttributes.get(element)!.add(attribute);
			}
		}

		const proxyModule = this.client.getModule(ProxyModule)!;

		for (const ctor of ctors) {
			for (const property in properties) {
				const propData = properties[property];

				const descriptor = Reflect.getOwnPropertyDescriptor(
					ctor.prototype,
					property
				);

				if (!descriptor) {
					throw new Error(`Ctor ${ctor} did not have ${property}`);
				}

				Reflect.defineProperty(ctor.prototype, property, {
					enumerable: true,
					configurable: true,
					get: proxyModule.wrapFunction(
						descriptor.get!,
						(target, that, args) => {
							// only side effect this getter has is the potential to throw an illegal invocation error
							Reflect.apply(target, that, args);

							return prototypeElement(that, element => {
								return propData[1](element);
							});
						}
					),
					set: proxyModule.wrapFunction(
						descriptor.set!,
						(target, that, args) => {
							Reflect.apply(target, that, args);

							prototypeElement(that, () => {
								if (
									!this.trackAttributes.get(that.nodeName)?.has(propData[0])
								) {
									return;
								}
								this.testHooks(that, propData[0]);
							});
						}
					),
				});
			}
		}

		this.attributeHooks.push([
			elements,
			callback,
			attributes,
			ctors,
			properties,
		]);
	}
	updateAttributeHooks(element: CustomElement, updated: string) {
		for (const hook of this.attributeHooks) {
			if (!hook[0].includes(element.nodeName)) continue;

			if (hook[2].includes(updated)) {
				hook[1](element);
			}
		}
	}
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		Reflect.defineProperty(Document.prototype, 'URL', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(Document.prototype, 'URL')!.get!,
				(target, that, args) => {
					// only side effect this getter has is the potential to throw an illegal invocation error
					Reflect.apply(target, that, args);
					invokeGlobal(that, location);
					return this.client.url.toString();
				}
			),
		});

		// this.applyHooks(useAttributes);

		Element.prototype.getAttribute = proxyModule.wrapFunction(
			Element.prototype.getAttribute,
			(target, that: Element, args) => {
				// only side effect this getter has is the potential to throw an illegal invocation error
				Reflect.apply(target, that, args);

				return prototypeElement(that, element => {
					return element.getOriginalAttribute(args[0]);
				});
			}
		);

		Element.prototype.setAttribute = proxyModule.wrapFunction(
			Element.prototype.setAttribute,
			(target, that: Element, args) => {
				Reflect.apply(target, that, args);

				const [attribute] = args;

				prototypeElement(that, element => {
					if (!this.trackAttributes.get(element.nodeName)?.has(attribute)) {
						return;
					}

					this.testHooks(element, attribute);
				});
			}
		);
	}
}
