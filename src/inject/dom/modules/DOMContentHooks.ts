import { modifyCSS } from '../../../rewriteCSS';
import { modifyJS } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	catchRequiredArguments,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient, { getGlobalParsingState } from '../Client';
import { parseHTMLFragment } from '../cloneNode';
import DOMAttributesModule, {
	scriptType,
	shouldRewriteScript,
} from './DOMAttributes';
import { CustomElement, nativeElement, nativeNode } from './DOMHooks';

export const nativeHTMLElement: HTMLElement = Object.create(nativeElement);
export const nativeHTMLStyleElement: HTMLStyleElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLFormElement: HTMLFormElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLScriptElement: HTMLScriptElement =
	Object.create(nativeHTMLElement);
export const nativeCharacterData: CharacterData = Object.create(nativeNode);
export const nativeDocumentFragment: DocumentFragment =
	Object.create(nativeNode);

applyDescriptors(nativeCharacterData, Text.prototype);
applyDescriptors(nativeDocumentFragment, DocumentFragment.prototype);
applyDescriptors(nativeHTMLElement, HTMLElement.prototype);
applyDescriptors(nativeHTMLStyleElement, HTMLStyleElement.prototype);
applyDescriptors(nativeHTMLScriptElement, HTMLScriptElement.prototype);
applyDescriptors(nativeHTMLFormElement, HTMLFormElement.prototype);

function getSupportedQueryInterface(
	node: Node
): DocumentFragment | Element | undefined {
	if (node.nodeName === '#document-fragment') {
		return nativeDocumentFragment;
	}

	try {
		usePrototype(node, nativeElement, (element) => {
			element.querySelector('*');
		});

		return nativeElement;
	} catch (error) {
		// unable to interface
	}
}

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

			for (let i = 0; i < rules.length; i++) {
				const added = style.sheet!.insertRule(
					modifyCSS(rules[i].cssText, this.client.url),
					i
				);
				(style.sheet!.cssRules[added] as any)[rewrittenRule] = true;
			}
		};

		const rewriteScript = (script: HTMLScriptElement) => {
			if (
				!shouldRewriteScript(script) ||
				(!script.isConnected &&
					getGlobalParsingState() !== 'parsingBeforeWrite')
			) {
				// eventually we'll catch a connected script
				return;
			}

			/*document.currentScript.textContent = ${JSON.stringify(
				script.textContent
			)};*/
			script.text = modifyJS(
				script.text,
				this.client.url,
				this.client.config,
				scriptType(script)
			);
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
			// if insert is a DocumentFragment, its childNodes will be cleared upon insertion
			// we need to snapshot the childNodes or run a query before its childNodes are cleared
			const styles: HTMLStyleElement[] = [];

			// we're about to render
			usePrototype(insert, nativeNode, (node) => {
				if (node.nodeName === 'SCRIPT') {
					usePrototype(insert, nativeHTMLScriptElement, (script) =>
						rewriteScript(script)
					);
				} else {
					const queryInterface = getSupportedQueryInterface(node);

					if (queryInterface)
						usePrototype(node, queryInterface, (queryable) => {
							for (const style of (insert as Element).querySelectorAll(
								'style'
							)) {
								styles.push(style);
							}

							for (const script of queryable.querySelectorAll('script'))
								usePrototype(script, nativeHTMLScriptElement, (script) =>
									rewriteScript(script)
								);
						});
				}
			});

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
			relative: Element,
			on: string,
			api: string
		): Element | null {
			switch (position) {
				case 'afterbegin':
				case 'beforeend':
					return relative;
				case 'beforebegin':
				case 'afterend':
					return relative.parentElement;
				default:
					throw new DOMException(
						`Failed to execute '${api}' on '${on}': The value provided ('${position}') is not one of 'beforeBegin', 'afterBegin', 'beforeEnd', or 'afterEnd'.`
					);
			}
		}

		function insertAdjacent(
			targetElement: Element,
			position: string,
			relative: Element,
			node: Node
		) {
			if (!targetElement) {
				return;
			}

			switch (position) {
				case 'afterbegin':
					if (targetElement.childNodes.length) {
						targetElement.insertBefore(node, targetElement.childNodes[0]);
					} else {
						targetElement.append(node, targetElement.childNodes[0]);
					}
					break;
				case 'beforebegin':
					targetElement.insertBefore(node, relative);
					break;
				case 'beforeend':
					targetElement.append(node);
					break;
				case 'afterend':
					{
						if (targetElement.childNodes.length) {
							const childNodes = [...targetElement.childNodes];
							const afterRelative =
								childNodes[childNodes.indexOf(relative) + 1];

							if (afterRelative) {
								console.log(afterRelative);
								targetElement.insertBefore(node, afterRelative);
							} else {
								// maybe the target ends with relative
								targetElement.append(node);
							}
						} else {
							targetElement.append(node);
						}
					}
					break;
			}
		}

		Element.prototype.insertAdjacentText = proxyModule.wrapFunction(
			Element.prototype.insertAdjacentText,
			(target, that: Element, args) => {
				catchRequiredArguments(args.length, 2, 'Element', 'insertAdjacentText');

				const position = String(args[0]);
				const insertNode: Node = new Text(args[1]);
				const targetElement = insertAdjacentTarget(
					position,
					that,
					'Element',
					'insertAdjacentText'
				);

				if (!targetElement) return;

				insert(insertNode, targetElement, () =>
					usePrototype(that, nativeElement, (element) =>
						insertAdjacent(targetElement, position, element, insertNode)
					)
				);
			}
		);

		Element.prototype.insertAdjacentElement = proxyModule.wrapFunction(
			Element.prototype.insertAdjacentElement,
			(target, that: Element, args) => {
				catchRequiredArguments(
					args.length,
					2,
					'Element',
					'insertAdjacentElement'
				);

				if (!(args[1] instanceof Element)) {
					throw new TypeError(
						`Failed to execute 'insertAdjacentElement' on 'Element': parameter 2 is not of type 'Element'.`
					);
				}

				const position = String(args[0]);
				const insertElement = args[1];
				const targetElement = insertAdjacentTarget(
					position,
					that,
					'Element',
					'insertAdjacentElement'
				);

				if (!targetElement) return;

				insert(insertElement, targetElement, () =>
					usePrototype(that, nativeElement, (element) =>
						insertAdjacent(targetElement, position, element, insertElement)
					)
				);
			}
		);

		Element.prototype.insertAdjacentHTML = proxyModule.wrapFunction(
			Element.prototype.insertAdjacentHTML,
			(target, that: Element, args) => {
				catchRequiredArguments(args.length, 2, 'Element', 'insertAdjacentHTML');

				const position = String(args[0]);
				const insertFragment: DocumentFragment = parseHTMLFragment(
					String(args[1])
				);
				const targetElement = insertAdjacentTarget(
					position,
					that,
					'Element',
					'insertAdjacentHTML'
				);

				if (!targetElement) return;

				insert(insertFragment, targetElement, () =>
					usePrototype(that, nativeElement, (element) =>
						insertAdjacent(targetElement, position, element, insertFragment)
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
