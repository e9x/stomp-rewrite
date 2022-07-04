import { modifyCSS } from '../../../rewriteCSS';
import { modifyJS } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient, { getGlobalParsingState } from '../Client';
import DOMAttributesModule from './DOMAttributes';
import { CustomElement, nativeElement, nativeNode } from './DOMHooks';

export const nativeHTMLElement: HTMLElement = Object.create(nativeElement);
export const nativeHTMLStyleElement: HTMLStyleElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLFormElement: HTMLFormElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLScriptElement: HTMLScriptElement =
	Object.create(nativeHTMLElement);
export const nativeCharacterData: CharacterData = Object.create(nativeNode);

applyDescriptors(nativeCharacterData, Text.prototype);
applyDescriptors(nativeHTMLElement, HTMLElement.prototype);
applyDescriptors(nativeHTMLStyleElement, HTMLStyleElement.prototype);
applyDescriptors(nativeHTMLScriptElement, HTMLScriptElement.prototype);
applyDescriptors(nativeHTMLFormElement, HTMLFormElement.prototype);

export default class DOMContentHooks extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const compositeElements = new Map<Element, () => Element>(); // new WeakMap<Element, () => Element>();

		/*const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
					usePrototype(node, nativeNode, (node) => {
						if (node.nodeName !== '#text') return;

						usePrototype(mutation.target, nativeNode, (target) => {
							if (target.nodeName !== 'STYLE') return;

							usePrototype(target, nativeHTMLStyleElement, (style) => {
								rewriteStyle(style);
							});
						});
					});
				}
			}
		});

		observer.observe(document, {
			subtree: true,
			childList: true,
		});*/

		const rewrittenRule = Symbol();

		function compositeElement(
			element: Element,
			createComposite: () => Element
		) {
			element.replaceWith(createComposite());
			Reflect.defineProperty(element, Symbol.toStringTag, {
				value: 'abc' + Math.random().toString(36).slice(2),
			});
			element.setAttribute((element as any)[Symbol.toStringTag], 'TEST');
			compositeElements.set(element, createComposite);
		}

		const rewriteStyle = (style: HTMLStyleElement) => {
			if (getGlobalParsingState() === 'parsingBeforeWrite') {
				// once everything is finalized and off the alternative parse stack

				if (style.textContent) {
					compositeElement(style, () => {
						const script = document.createElement('script');

						usePrototype(script, nativeHTMLScriptElement, (script) => {
							script.textContent = `document.currentScript.outerHTML=${JSON.stringify(
								style.outerHTML
							)}`;
						});

						return script;
					});
				}

				return;
			}

			// not in document
			if (!style.sheet) {
				// eventually we'll catch a connected style
				return;
			}

			const rules = [...style.sheet!.cssRules].filter(
				(rule) => !(rule as any)[rewrittenRule]
			);

			for (let i = 0; i < rules.length; i++) {
				style.sheet!.deleteRule(rules.length - i - 1);
			}

			for (const rule of rules) {
				const added = style.sheet!.insertRule(
					modifyCSS(rule.cssText, this.client.url),
					0
				);
				(style.sheet!.cssRules[added] as any)[rewrittenRule] = true;
			}
		};

		const rewriteScript = (script: HTMLScriptElement) => {
			if (
				!script.isConnected &&
				getGlobalParsingState() !== 'parsingBeforeWrite'
			) {
				// eventually we'll catch a connected script
				return;
			}

			/*document.currentScript.textContent = ${JSON.stringify(
				script.textContent
			)};*/
			script.text = `${modifyJS(
				script.text,
				this.client.url,
				this.client.config,
				'generic'
			)}`;
		};

		function cdUpdated(element: CharacterData, parent?: Element | null) {
			if (!parent) return;

			usePrototype(parent, nativeElement, (element) => {
				if (element.nodeName !== 'STYLE') return;

				usePrototype(element, nativeHTMLStyleElement, (style) =>
					rewriteStyle(style)
				);
			});
		}

		for (const triggersRender of ['replaceWith', 'replaceData', 'remove']) {
			(CharacterData.prototype as any)[triggersRender] =
				proxyModule.wrapFunction(
					(CharacterData.prototype as any)[triggersRender],
					(target, that: CharacterData, args) => {
						// will be null after remove()
						const parent = usePrototype(
							that,
							nativeCharacterData,
							(cd) => cd.parentElement
						);

						const result = Reflect.apply(target, that, args);

						cdUpdated(that, parent);

						return result;
					}
				);
		}

		const dataDescriptor = Reflect.getOwnPropertyDescriptor(
			CharacterData.prototype,
			'data'
		)!;

		Reflect.defineProperty(CharacterData.prototype, 'data', {
			enumerable: true,
			configurable: true,
			get: dataDescriptor.get,
			set: proxyModule.wrapFunction(
				dataDescriptor.set!,
				(target, that: CharacterData, args) => {
					Reflect.apply(target, that, args);

					cdUpdated(that);
				}
			),
		});

		for (const [prototype, property] of <[object, string][]>[
			[Node.prototype, 'nodeValue'],
		]) {
			const descriptor = Reflect.getOwnPropertyDescriptor(prototype, property)!;

			Reflect.defineProperty(prototype, property, {
				enumerable: true,
				configurable: true,
				get: descriptor.get,
				set: proxyModule.wrapFunction(descriptor.set!, (target, that, args) => {
					Reflect.apply(target, that, args);

					cdUpdated(that);
				}),
			});
		}

		/**
		 * Called after a function with side-effects that may trigger a style to re-render.
		 * @param target Text. Possibly a child of a Style.
		 */
		function textUpdatesStyle(target: CharacterData) {
			try {
				usePrototype(target, nativeHTMLElement, (element) => {
					// only applies to .replaceWith where a #text is being replaced with a different text
					if (element.parentElement?.nodeName === 'STYLE') {
						usePrototype(
							target.parentElement!,
							nativeHTMLStyleElement,
							(style) => rewriteStyle(style)
						);
					}

					// general inserting things into style
					if (element.nodeName === 'STYLE') {
						// usePrototype(inserted, nativeHTMLElement, (element: HTMLElement) => {
						usePrototype(element, nativeHTMLStyleElement, (style) =>
							rewriteStyle(style)
						);
					}
				});
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.includes('.querySelectorAll')
				) {
					console.error(error, target);
				}
			}
		}

		const domAttributesModule = this.client.getModule(DOMAttributesModule)!;

		const insert = <T>(
			insert: Node,
			that: Node | null,
			insertElement: () => T
		): T => {
			try {
				// we're about to render
				// usePrototype(inserted, nativeHTMLElement, (element: HTMLElement) => {
				if (insert.nodeName === 'SCRIPT') {
					usePrototype(insert, nativeHTMLScriptElement, (script) =>
						rewriteScript(script)
					);
				} else
					for (const script of (insert as Element).querySelectorAll('script'))
						usePrototype(script, nativeHTMLScriptElement, (script) =>
							rewriteScript(script)
						);
				// });
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.includes('.querySelectorAll')
				) {
					console.error(error, insert);
				}
			}

			const styles: HTMLStyleElement[] = [];

			// if insert is a DocumentFragment, its childNodes will be cleared upon insertion
			// we need to snapshot the childNodes or run a query before its childNodes are cleared
			try {
				for (const style of (insert as Element).querySelectorAll('style')) {
					styles.push(style);
				}
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.includes('.querySelectorAll')
				) {
					console.error(error, insert);
				}
			}

			const result = insertElement();

			usePrototype(insert, nativeNode, (node) => {
				switch (node.nodeName) {
					case 'FORM':
						usePrototype(insert, CustomElement.prototype, (form) => {
							domAttributesModule.formHook!(form);
						});
						break;
					case 'STYLE':
						usePrototype(insert, nativeHTMLStyleElement, (style) =>
							rewriteStyle(style)
						);
				}
			});

			for (const style of styles) {
				usePrototype(style, nativeHTMLStyleElement, (style) =>
					rewriteStyle(style)
				);
			}

			textUpdatesStyle(that as CharacterData);

			return result;
		};

		const willInsertNode = (x: (inserted: Node, ...args: any[]) => any) =>
			proxyModule.wrapFunction(x, (target, that, args) =>
				insert(args[0], that, () => Reflect.apply(target, that, args))
			);

		Node.prototype.appendChild = willInsertNode(Node.prototype.appendChild);
		Element.prototype.append = willInsertNode(Element.prototype.append);
		Node.prototype.insertBefore = willInsertNode(Node.prototype.insertBefore);
		Node.prototype.replaceChild = willInsertNode(Node.prototype.replaceChild);
		Element.prototype.replaceWith = willInsertNode(
			Element.prototype.replaceWith
		);

		function insertAdjacentTarget(
			position: string,
			relative: Element
		): Element | null {
			switch (position) {
				case 'afterbegin':
				case 'beforeend':
					return relative;
				case 'beforebegin':
				case 'afterend':
				default:
					return relative.parentElement;
			}
		}

		function insertAdjacent(position: string, relative: Element, node: Node) {
			const target = insertAdjacentTarget(position, relative);

			if (!target) {
				return;
			}

			switch (position) {
				case 'afterbegin':
					if (target.childNodes.length) {
						target.insertBefore(node, target.childNodes[0]);
					} else {
						target.append(node, target.childNodes[0]);
					}
					break;
				case 'beforebegin':
					target.insertBefore(node, relative);
					break;
				case 'beforeend':
					target.append(node);
					break;
				case 'afterend':
					{
						if (target.childNodes.length) {
							const childNodes = [...target.childNodes];
							const afterRelative =
								childNodes[childNodes.indexOf(relative) + 1];

							if (afterRelative) {
								console.log(afterRelative);
								target.insertBefore(node, afterRelative);
							} else {
								// maybe the target ends with relative
								target.append(node);
							}
						} else {
							target.append(node);
						}
					}
					break;
			}
		}

		Element.prototype.insertAdjacentText = proxyModule.wrapFunction(
			Element.prototype.insertAdjacentText,
			(target, that: Element, args) => {
				const position = String(args[0]);
				const node: Node = new Text(args[1]);

				insert(node, insertAdjacentTarget(position, that), () =>
					usePrototype(that, nativeElement, (element) =>
						insertAdjacent(position, element, node)
					)
				);
			}
		);

		// does not insert element
		Node.prototype.removeChild = proxyModule.wrapFunction(
			Node.prototype.removeChild,
			(target, that, args) => {
				const result = Reflect.apply(target, that, args);

				textUpdatesStyle(that);

				return result;
			}
		);
	}
}
