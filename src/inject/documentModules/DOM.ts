import Client from '../Client';
import Module from '../Module';
import ProxyModule, {
	applyDescriptors,
	invokeGlobal,
} from '../baseModules/Proxy';

const ORIGINAL_ATTRIBUTE = `sO:`;

const attributeTab = new WeakMap<CustomElement, Map<string, string | null>>();

class CustomElement extends Element {
	get attributeTab() {
		if (!attributeTab.has(this)) {
			attributeTab.set(this, new Map());
		}

		return attributeTab.get(this)!;
	}
	getAttribute(attribute: string): string | null {
		if (this.attributeTab.has(attribute)) {
			return this.attributeTab.get(attribute)!;
		} else {
			return nativeElement.getAttribute.call(this, attribute);
		}
	}
	setAttribute(attribute: string, value: string) {
		this.attributeTab.set(attribute, value);
	}
	removeAttribute(attribute: string) {
		this.attributeTab.set(attribute, null);
	}
	hasAttribute(attribute: string) {
		if (this.attributeTab.has(attribute)) {
			return this.attributeTab.get(attribute) !== null;
		}

		return nativeElement.hasAttribute.call(this, attribute);
	}
	applyAttributes() {
		for (const [attribute, value] of this.attributeTab) {
			this.attributeTab.delete(attribute);

			if (value === null) {
				nativeElement.removeAttribute.call(this, attribute);
			} else {
				nativeElement.setAttribute.call(this, attribute, value);
			}
		}

		attributeTab.delete(this);
	}
	getAttributeOG(attribute: string): string | null {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		if (this.hasAttribute(og)) {
			return this.getAttribute(og)!;
		} else {
			return null;
		}
	}
	setAttributeOG(attribute: string, value: string) {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		this.setAttribute(og, value);
	}
	hasAttributeOG(attribute: string): boolean {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		return this.hasAttribute(og);
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
 * The node is in a simulated detached state while being worked with, to avoid making many requests as attributes are set.
 */
function prototypeElement<T>(
	element: Element,
	// recast the element type to reflect changes
	callback: (element: CustomElement) => T
): T {
	const prototype = Reflect.getPrototypeOf(element);
	Reflect.setPrototypeOf(element, CustomElement.prototype);

	// recast
	const customElement = element as CustomElement;

	let result: any[] = [];

	try {
		result = [callback(customElement)];
	} catch (error) {
		result = [undefined, error];
	}

	customElement.applyAttributes();

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
	private attributeHooks: [
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
	private previousAttributes: WeakMap<Element, Map<string, string>>;
	private trackAttributes: Map<string, Set<string>>;
	private trackProperties: Map<ElementCtor, Map<string, PropData>>;
	constructor(client: Client) {
		super(client);

		this.attributeHooks = [];
		this.previousAttributes = new WeakMap();
		this.trackAttributes = new Map();
		this.trackProperties = new Map();
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

		for (const ctor of ctors) {
			if (!this.trackProperties.has(ctor)) {
				this.trackProperties.set(ctor, new Map());
			}

			for (const property in properties) {
				if (this.trackProperties.get(ctor)!.has(property)) {
					throw new Error(`Property hooks cannot overlap.`);
				}

				this.trackProperties.get(ctor)!.set(property, properties[property]);
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
	private updateAttributeHooks(element: CustomElement, updated: string) {
		for (const hook of this.attributeHooks) {
			if (!hook[0].includes(element.nodeName)) continue;

			if (hook[2].includes(updated)) {
				hook[1](element);
			}
		}
	}
	apply() {
		// all hooks are in, now apply them

		// MutationObserver will leak a lot of values and is complex.. we cannot support this yet.
		delete (global as any).MutationObserver;

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

		Element.prototype.getAttribute = proxyModule.wrapFunction(
			Element.prototype.getAttribute,
			(target, that: Element, args) => {
				// only side effect this getter has is the potential to throw an illegal invocation error
				Reflect.apply(target, that, args);

				const attribute: string = args[0];

				return prototypeElement(that, element => {
					if (element.hasAttributeOG(attribute)) {
						return element.getAttributeOG(attribute);
					} else {
						return element.getAttribute(attribute);
					}
				});
			}
		);

		Element.prototype.setAttribute = proxyModule.wrapFunction(
			Element.prototype.setAttribute,
			(target, that: Element, args) => {
				// too many side effects
				// illegal invocation error will throw by nature
				// Reflect.apply(target, that, args);

				const [attribute, value] = args;

				prototypeElement(that, element => {
					element.setAttribute(attribute, value);

					if (!this.trackAttributes.get(element.nodeName)?.has(attribute)) {
						return;
					}

					this.testHooks(element, attribute);
				});
			}
		);

		for (const [ctor, properties] of this.trackProperties) {
			for (const [property, propData] of properties) {
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
					get: proxyModule.wrapFunction(descriptor.get!, (target, that) => {
						return prototypeElement(that, element => {
							return propData[1](element);
						});
					}),
					set: proxyModule.wrapFunction(
						descriptor.set!,
						(target, that, args) => {
							const [value] = args;

							prototypeElement(that, element => {
								element.setAttribute(propData[0], value);

								if (
									!this.trackAttributes.get(element.nodeName)?.has(propData[0])
								) {
									return;
								}

								this.testHooks(element, propData[0]);
							});
						}
					),
				});
			}
		}
	}
}
