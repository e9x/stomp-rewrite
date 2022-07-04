import { modifyCSS } from '../../../rewriteCSS';
import { modifyJS } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient, { getGlobalParsingState } from '../Client';
import { nativeElement, nativeNode } from './DOM';

export const nativeHTMLElement: HTMLElement = Object.create(nativeElement);
export const nativeHTMLStyleElement: HTMLStyleElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLScriptElement: HTMLScriptElement =
	Object.create(nativeHTMLElement);
export const nativeCharacterData: CharacterData = Object.create(nativeNode);

applyDescriptors(nativeCharacterData, Text.prototype);
applyDescriptors(nativeHTMLElement, HTMLElement.prototype);
applyDescriptors(nativeHTMLStyleElement, HTMLStyleElement.prototype);
applyDescriptors(nativeHTMLScriptElement, HTMLScriptElement.prototype);

export default class DOMStyleModule extends Module<DocumentClient> {
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

			console.trace(
				'composite',
				element,
				element.isConnected,
				Object.fromEntries(compositeElements)
			);
		}

		const rewriteStyle = (style: HTMLStyleElement) => {
			if (getGlobalParsingState() === 'parsingBeforeWrite') {
				// once everything is finalized and off the alternative parse stack

				console.log(style.textContent);

				if (style.textContent) {
					compositeElement(style, () => {
						console.trace('composite gets called...');
						const script = document.createElement('script');

						usePrototype(script, nativeHTMLScriptElement, (script) => {
							script.textContent = `console.log('setting outerhtml...'); document.currentScript.outerHTML=${JSON.stringify(
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
				console.trace(
					style,
					style.textContent,
					'not connected',
					getGlobalParsingState()
				);
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
				console.log(script, getGlobalParsingState());
				// eventually we'll catch a connected script
				return;
			}

			// console.log(script.textContent);
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

		const willInsertNode = (x: (inserted: Node, ...args: any[]) => any) =>
			proxyModule.wrapFunction(x, (target, that, args) => {
				const inserted: Element = args[0];

				try {
					// we're about to render
					// usePrototype(inserted, nativeHTMLElement, (element: HTMLElement) => {
					if (inserted.nodeName === 'SCRIPT') {
						usePrototype(inserted, nativeHTMLScriptElement, (script) =>
							rewriteScript(script)
						);
					} else
						for (const script of inserted.querySelectorAll('script'))
							usePrototype(script, nativeHTMLScriptElement, (script) =>
								rewriteScript(script)
							);
					// });
				} catch (error) {
					if (
						!(error instanceof Error) ||
						!error.message.includes('.querySelectorAll')
					) {
						console.log(error, inserted);
					}
				}

				const styles: HTMLStyleElement[] = [];

				// if inserted is a DocumentFragment, its childNodes will be cleared upon insertion
				// we need to snapshot the childNodes or run a query before its childNodes are cleared
				try {
					for (const style of inserted.querySelectorAll('style')) {
						styles.push(style);
					}
				} catch (error) {
					if (
						!(error instanceof Error) ||
						!error.message.includes('.querySelectorAll')
					) {
						console.log(error, inserted);
					}
				}

				const result = Reflect.apply(target, that, args);

				if (inserted.nodeName === 'STYLE')
					usePrototype(inserted, nativeHTMLStyleElement, (style) =>
						rewriteStyle(style)
					);
				else {
					for (const style of styles) {
						usePrototype(style, nativeHTMLStyleElement, (style) =>
							rewriteStyle(style)
						);
					}
				}

				// element such as text was inserted
				try {
					// only applies to .replaceWith where a #text is being replaced with a different text
					if (that.parentElement?.nodeName === 'STYLE') {
						usePrototype(that.parentElement, nativeHTMLStyleElement, (style) =>
							rewriteStyle(style)
						);
					}

					// general inserting things into style
					if (that.nodeName === 'STYLE') {
						// usePrototype(inserted, nativeHTMLElement, (element: HTMLElement) => {
						usePrototype(that, nativeHTMLStyleElement, (style) =>
							rewriteStyle(style)
						);
					}
				} catch (error) {
					//
				}

				return result;
			});

		Node.prototype.appendChild = willInsertNode(Node.prototype.appendChild);
		Element.prototype.append = willInsertNode(Element.prototype.append);
		Node.prototype.insertBefore = willInsertNode(Node.prototype.insertBefore);
		Node.prototype.replaceChild = willInsertNode(Node.prototype.replaceChild);
		Element.prototype.replaceWith = willInsertNode(
			Element.prototype.replaceWith
		);

		// does not insert element
		Node.prototype.removeChild = proxyModule.wrapFunction(
			Node.prototype.removeChild,
			(target, that, args) => {
				const result = Reflect.apply(target, that, args);

				// checkUpdateStyle(that);

				return result;
			}
		);
	}
}
