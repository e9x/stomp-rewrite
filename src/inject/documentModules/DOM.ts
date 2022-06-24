import StompURL from '../../StompURL';
import { routeCSS } from '../../rewriteCSS';
import Module from '../Module';
import ProxyModule from '../baseModules/Proxy';

const ORIGINAL_ATTRIBUTE = `$s$O:`;

/*function setPreserveAttribute() {
	
}*/

function applyDescriptors(target: any, from: any): any {
	Object.defineProperties(target, Object.getOwnPropertyDescriptors(from));
}

const nativeNode = {};
const nativeElement = Object.create(nativeNode);

applyDescriptors(nativeNode, Node.prototype);
applyDescriptors(nativeElement, Element.prototype);

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

export default class DOMModule extends Module {
	private applyHooks(
		useAttributes: (
			element: string[],
			callback: (element: Element) => void,
			attributes: string[]
		) => void
	) {
		useAttributes(
			['LINK'],
			element => {
				if (element.hasAttribute('href') && element.hasAttribute('rel')) {
					switch (element.getAttribute('rel')) {
						case 'stylesheet':
							element.setAttribute(
								'href',
								routeCSS(
									new StompURL(
										new URL(
											element.getAttribute('href')!,
											this.client.url.toString()
										),
										this.client.url
									),
									this.client.url
								)
							);
							break;
					}
				}
			},
			['link', 'rel']
		);
	}
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		Reflect.defineProperty(Document.prototype, 'URL', {
			enumerable: true,
			configurable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(Document.prototype, 'URL')!.get!,
				(target, that, args) => this.client.url.toString()
			),
		});

		const attributeHooks: [
			type: string[],
			callback: (element: Element) => void,
			attributes: string[]
		][] = [];

		function useAttributes(
			element: string[],
			callback: (element: Element) => void,
			attributes: string[]
		) {
			attributeHooks.push([element, callback, attributes]);
		}

		this.applyHooks(useAttributes);

		function originalAttribute(
			element: Element,
			attribute: string
		): string | undefined {
			const og = `${ORIGINAL_ATTRIBUTE}${attribute}`;

			if (element.hasAttribute(og)) {
				return element.getAttribute(og)!;
			}
		}

		/*
		 * Sets the prototype of an element while this script is working with it. This is to ensure we are only accessing the native functions and not any traps/shims.
		 * The node is in a detached state while being worked with, to avoid making many requests as attributes are set.
		 */
		function prototypeElement(element: Element, callback: () => void) {
			const prototype = Reflect.getPrototypeOf(element);
			Reflect.setPrototypeOf(element, nativeElement);

			const parent = element.parentElement;
			const sibling = element.nextSibling;
			element.remove();

			let throwError: [any?] = [];

			try {
				callback();
			} catch (error) {
				throwError = [error];
			}

			parent?.insertBefore(sibling!, element);

			Reflect.setPrototypeOf(element, prototype);

			if (throwError.length) {
				throw throwError[0];
			}
		}

		const previousAttributes = new WeakMap<Element, Map<string, string>>();

		const trackAttributes = new Map<string, Set<string>>();

		for (const hook of attributeHooks) {
			for (const element of hook[0]) {
				if (!trackAttributes.has(element)) {
					trackAttributes.set(element, new Set());
				}

				for (const attribute of hook[2]) {
					trackAttributes.get(element)!.add(attribute);
				}
			}
		}

		function updateAttributeHooks(element: Element, updated: string) {
			for (const hook of attributeHooks) {
				if (!hook[0].includes(element.nodeName)) continue;

				if (hook[2].includes(updated)) {
					hook[1](element);
				}
			}
		}

		Element.prototype.getAttribute = proxyModule.wrapFunction(
			Element.prototype.getAttribute,
			(target, that: Element, args) => {
				console.log(args, that);
				return Reflect.apply(target, that, args);
			}
		);

		Element.prototype.setAttribute = proxyModule.wrapFunction(
			Element.prototype.setAttribute,
			(target, that: Element, args) => {
				prototypeElement(that, () => {
					Reflect.apply(target, that, args);

					const attribute: string = args[0];
					const value: string = args[1];

					if (!trackAttributes.get(that.nodeName)?.has(attribute)) {
						return;
					}

					if (!previousAttributes.has(that)) {
						previousAttributes.set(that, new Map());
					}

					const pA = previousAttributes.get(that)!;

					if (pA.get(attribute) !== value) {
						updateAttributeHooks(that, attribute);
						pA.set(attribute, value);
					}
				});
			}
		);
	}
}
