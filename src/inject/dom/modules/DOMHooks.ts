import StompURL from '../../../StompURL';
import { routeHTML } from '../../../rewriteHTML';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	cleanupPrototype,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient, {
	getGlobalParsingState,
	setGlobalParsingState,
} from '../Client';
import cloneRawNode, { parseHTMLFragment } from '../cloneNode';

const attributeTab = new WeakMap<CustomElement, Map<string, string | null>>();

const ORIGINAL_ATTRIBUTE = `s_o:`;

export class CustomElement extends Element {
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

			try {
				if (value === null) {
					nativeElement.removeAttribute.call(this, attribute);
				} else {
					nativeElement.setAttribute.call(this, attribute, value);
				}
			} catch (error) {
				console.warn('bad attribute', attribute, value, error);
			}
		}

		attributeTab.delete(this);
	}
	/**
	 * Wipes conflicting attributes and replaces them with original values.
	 */
	restoreAttributesOG(...names: string[]) {
		// this.getAttributeNamesOG()
		for (const name of names) {
			if (!this.hasAttributeOG(name)) {
				continue;
			}

			this.setAttribute(name, this.getAttributeOG(name)!);
			this.removeAttributeOG(name);
		}
	}
	[cleanupPrototype]() {
		this.applyAttributes();
	}
	getAttributeOG(attribute: string): string | null {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		if (this.hasAttribute(og)) {
			return this.getAttribute(og)!;
		} else {
			return null;
		}
	}
	getAttributeNamesOG(): string[] {
		const names: string[] = [];

		for (const name of this.getAttributeNames())
			if (name.startsWith(ORIGINAL_ATTRIBUTE))
				names.push(name.slice(ORIGINAL_ATTRIBUTE.length));

		console.log(names, ORIGINAL_ATTRIBUTE, this.getAttributeNames());

		return names;
	}
	setAttributeOG(attribute: string, value: string) {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		this.setAttribute(og, value);
	}
	hasAttributeOG(attribute: string): boolean {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		return this.hasAttribute(og);
	}
	removeAttributeOG(attribute: string) {
		const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

		this.removeAttribute(og);
	}
}

export const nativeEventTarget: EventTarget = <any>{};
export const nativeNode: Node = Object.create(nativeEventTarget);
export const nativeElement: HTMLElement = Object.create(nativeNode);

applyDescriptors(nativeNode, Node.prototype);
applyDescriptors(nativeEventTarget, EventTarget.prototype);
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

type HookCallback = (element: CustomElement) => void;

type AttributeHook = [nodeName: Element['nodeName'], attribute: string];

/**
 * This function is called when the property is accessed on the specified element ctor. If false, the next property hook getter will be called until the result is a string.
 */
type PropertyHookGetter = (element: CustomElement) => string | false;

type PropertyHook = [
	ctor: ElementCtor,
	Property: string,
	getter: PropertyHookGetter
];

function isAttributeHook(
	hook: AttributeHook | PropertyHook
): hook is AttributeHook {
	return typeof hook[0] === 'string';
}

/**
 * Provides a framework for hooking elements
 */
export default class DOMHooksModule extends Module<DocumentClient> {
	private hooks: {
		hook: AttributeHook | PropertyHook;
		callback: HookCallback;
	}[];
	constructor(client: DocumentClient) {
		super(client);

		this.hooks = [];
	}
	/*useAttributes(
		callback: (element: CustomElement) => void,
		elements: string[],
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
				if (!this.trackProperties.get(ctor)!.has(property)) {
					this.trackProperties.get(ctor)!.set(property, []);
					console.error(this.trackProperties.get(ctor), property);
					throw new Error(`Property hooks cannot overlap.`);
				}

				this.trackProperties
					.get(ctor)!
					.get(property)!
					.push(properties[property]);
			}
		}

		this.attributeHooks.push([
			elements,
			callback,
			attributes,
			ctors,
			properties,
		]);
	}*/
	useAttributes(
		callback: HookCallback,
		hooks: (AttributeHook | PropertyHook)[]
	) {
		for (const hook of hooks) {
			this.hooks.push({
				callback,
				hook,
			});
		}
	}
	private updateAttributeHooks(element: CustomElement, attribute: string) {
		for (const entry of this.hooks) {
			if (
				!isAttributeHook(entry.hook) ||
				entry.hook[0] !== element.nodeName ||
				entry.hook[1] !== attribute
			)
				continue;

			entry.callback(element);
		}
	}
	private updatePropertyHooks(
		element: CustomElement,
		ctor: ElementCtor,
		property: string
	) {
		for (const entry of this.hooks) {
			if (
				isAttributeHook(entry.hook) ||
				entry.hook[0] !== ctor ||
				entry.hook[1] !== property
			)
				continue;

			entry.callback(element);
		}
	}
	apply() {
		// all hooks are in, now apply them

		// MutationObserver will leak a lot of values and is complex.. we cannot support this yet.
		// delete (global as any).MutationObserver;

		const proxyModule = this.client.getModule(ProxyModule)!;

		/**
		 * Etc hooks are here
		 */

		window.open = proxyModule.wrapFunction(
			window.open,
			(target, that, args) => {
				if (args[0] !== undefined)
					args[0] = routeHTML(
						new StompURL(
							new URL(String(args[0]), this.client.url.toString()),
							this.client.url
						),
						this.client.url,
						this.client.config
					);

				return Reflect.apply(target, that, args);
			}
		);

		type Write = (...text: string[]) => void;
		const writeFactory = (target: Write): Write =>
			proxyModule.wrapFunction(target, (target, that, args) => {
				for (let i = 0; i < args.length; i++) {
					const prevState = getGlobalParsingState();
					setGlobalParsingState('parsingBeforeWrite');
					const div = document.createElement('div');
					div.append(cloneRawNode(parseHTMLFragment(String(args[i]))));
					args[i] = div.innerHTML;
					setGlobalParsingState(prevState);
				}

				Reflect.apply(target, that, args);
			});

		document.write = writeFactory(document.write);
		document.writeln = writeFactory(document.writeln);

		Reflect.defineProperty(Node.prototype, 'baseURI', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(Node.prototype, 'baseURI')!.get!,
				(target, that, args) => {
					// only side effect this getter has is the potential to throw an illegal invocation error
					Reflect.apply(target, that, args);
					return this.client.url.toString();
				}
			),
		});

		Reflect.defineProperty(Document.prototype, 'URL', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(Document.prototype, 'URL')!.get!,
				(target, that, args) => {
					// only side effect this getter has is the potential to throw an illegal invocation error
					Reflect.apply(target, that, args);
					return this.client.location.toString();
				}
			),
		});

		Reflect.defineProperty(Document.prototype, 'domain', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(Document.prototype, 'domain')!.get!,
				(target, that, args) => {
					// only side effect this getter has is the potential to throw an illegal invocation error
					Reflect.apply(target, that, args);
					return this.client.url.url.hostname;
				}
			),
		});

		/**
		 * Make sure hooks are triggered instead of unhooked elements being generated.
		 * Generation being:
		 * .innerHTML (generates any element)
		 * .outerHTML
		 * .innerText (generates Text)
		 * .outerText
		 * .textContent
		 */

		/**
		 * Text getters can safely be ignored
		 * Scripts and style text should appear to be unhooked
		 */

		const scriptTextDescriptor = Reflect.getOwnPropertyDescriptor(
			HTMLScriptElement.prototype,
			'text'
		)!;

		Reflect.defineProperty(HTMLScriptElement.prototype, 'text', {
			enumerable: true,
			configurable: true,
			get: scriptTextDescriptor.get,
			set: proxyModule.wrapFunction(
				scriptTextDescriptor.set!,
				(target, that: HTMLScriptElement, args) => {
					for (const node of that.childNodes) {
						node.remove();
					}

					that.append(new Text(args[0]));
				}
			),
		});

		const textContentDescriptor = Reflect.getOwnPropertyDescriptor(
			Node.prototype,
			'textContent'
		)!;

		Reflect.defineProperty(Node.prototype, 'textContent', {
			enumerable: true,
			configurable: true,
			get: textContentDescriptor.get,
			set: proxyModule.wrapFunction(
				textContentDescriptor.set!,
				(target, that: Element, args) => {
					for (const node of that.childNodes) {
						node.remove();
					}

					that.append(new Text(args[0]));
				}
			),
		});

		const innerTextDescriptor = Reflect.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'innerText'
		)!;

		Reflect.defineProperty(HTMLElement.prototype, 'innerText', {
			enumerable: true,
			configurable: true,
			get: innerTextDescriptor.get,
			set: proxyModule.wrapFunction(
				innerTextDescriptor.set!,
				(target, that: Element, args) => {
					for (const node of that.childNodes) {
						node.remove();
					}

					that.append(new Text(args[0]));
				}
			),
		});

		const outerTextDescriptor = Reflect.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'outerText'
		)!;

		Reflect.defineProperty(HTMLElement.prototype, 'outerText', {
			enumerable: true,
			configurable: true,
			get: outerTextDescriptor.get,
			set: proxyModule.wrapFunction(
				outerTextDescriptor.set!,
				(target, that: Element, args) => {
					that.replaceWith(new Text(args[0]));
				}
			),
		});

		/**
		 * inner and outer HTML need to have their getters hooked
		 * this will reveal hooked attributes etc
		 *
		 * Element.prototype.getInnerHTML
		 */

		if ('getInnerHTML' in Element.prototype) {
			(Element.prototype as any).getInnerHTML = proxyModule.wrapFunction(
				(Element.prototype as any).getInnerHTML as () => string,
				(target, that) => {
					return that.innerHTML;
				}
			);
		}

		const innerHTMLDescriptor = Reflect.getOwnPropertyDescriptor(
			Element.prototype,
			'innerHTML'
		)!;

		Reflect.defineProperty(Element.prototype, 'innerHTML', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				innerHTMLDescriptor.get!,
				(target, that, args) => {
					// todo
					return Reflect.apply(target, that, args);
				}
			),
			set: proxyModule.wrapFunction(
				innerHTMLDescriptor.set!,
				(target, that: Element, args) => {
					for (const node of that.childNodes) {
						node.remove();
					}

					that.append(cloneRawNode(parseHTMLFragment(args[0])));
				}
			),
		});

		const outerHTMLDescriptor = Reflect.getOwnPropertyDescriptor(
			Element.prototype,
			'outerHTML'
		)!;

		Reflect.defineProperty(Element.prototype, 'outerHTML', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				outerHTMLDescriptor.get!,
				(target, that, args) => {
					// todo
					return Reflect.apply(target, that, args);
				}
			),
			set: proxyModule.wrapFunction(
				outerHTMLDescriptor.set!,
				(target, that: Element, args) => {
					that.replaceWith(cloneRawNode(parseHTMLFragment(args[0])));
				}
			),
		});

		Element.prototype.getAttribute = proxyModule.wrapFunction(
			Element.prototype.getAttribute,
			(target, that: Element, args) => {
				// only side effect this getter has is the potential to throw an illegal invocation error
				Reflect.apply(target, that, args);

				const attribute: string = args[0];

				return usePrototype(that, CustomElement.prototype, (element) => {
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

				usePrototype(that, CustomElement.prototype, (element) => {
					element.setAttribute(attribute, value);

					this.updateAttributeHooks(element, attribute);
				});
			}
		);

		Element.prototype.removeAttribute = proxyModule.wrapFunction(
			Element.prototype.removeAttribute,
			(target, that: Element, args) => {
				// too many side effects
				// illegal invocation error will throw by nature
				// Reflect.apply(target, that, args);

				const [attribute] = args;

				usePrototype(that, CustomElement.prototype, (element) => {
					element.removeAttribute(attribute);
					element.removeAttributeOG(attribute);
					this.updateAttributeHooks(element, attribute);
				});
			}
		);

		const trackProperties = new Map<ElementCtor, Set<string>>();

		for (const entry of this.hooks) {
			if (isAttributeHook(entry.hook)) continue;

			if (!trackProperties.has(entry.hook[0])) {
				trackProperties.set(entry.hook[0], new Set());
			}

			trackProperties.get(entry.hook[0])!.add(entry.hook[1]);
		}

		for (const [ctor, properties] of trackProperties) {
			for (const property of properties) {
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
							return usePrototype(that, CustomElement.prototype, (element) => {
								for (const entry of this.hooks) {
									if (isAttributeHook(entry.hook)) continue;

									const result = entry.hook[2](element);

									if (result === false) continue;

									return result;
								}

								return Reflect.apply(target, that, args);
							});
						}
					),
					set: proxyModule.wrapFunction(
						descriptor.set!,
						(target, that, args) => {
							// properties are only set at the end of the stack
							// attributes differ because they will immediately have an effect and will overrule properties set in the same stack

							Reflect.apply(target, that, args);

							usePrototype(that, CustomElement.prototype, (element) => {
								this.updatePropertyHooks(element, ctor, property);
							});

							// getter isn't stack based and we can use this to make the attribute immediately take effect

							// equivalent to
							// i.src = i.src
							Reflect.apply(target, that, [
								Reflect.apply(descriptor.get!, that, []),
							]);
						}
					),
				});
			}
		}
	}
}
