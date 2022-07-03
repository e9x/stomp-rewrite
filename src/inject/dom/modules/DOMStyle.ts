import { modifyCSS } from '../../../rewriteCSS';
import { modifyJS } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient, { getGlobalParsingState } from '../Client';
import { CustomElement, nativeElement, nativeNode } from './DOM';

export const nativeHTMLElement: HTMLElement = Object.create(nativeElement);
export const nativeHTMLStyleElement: HTMLStyleElement =
	Object.create(nativeHTMLElement);
export const nativeHTMLScriptElement: HTMLScriptElement =
	Object.create(nativeHTMLElement);
export const nativeText: Text = Object.create(nativeNode);

applyDescriptors(nativeText, Text.prototype);
applyDescriptors(nativeHTMLElement, HTMLElement.prototype);
applyDescriptors(nativeHTMLStyleElement, HTMLStyleElement.prototype);
applyDescriptors(nativeHTMLScriptElement, HTMLScriptElement.prototype);

export default class DOMStyleModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
					console.log(node);

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
			childList: true,
			subtree: true,
			characterData: true,
		});

		const rewrittenRule = Symbol();

		const rewriteStyle = (style: HTMLStyleElement) => {
			if (!style.isConnected) {
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

		function textUpdated(element: Text) {
			usePrototype(element, nativeText, (text) => {
				if (!text.parentNode) {
					return;
				}

				usePrototype(text.parentNode, CustomElement.prototype, (parent) => {
					if (parent.nodeName !== 'STYLE') return;

					usePrototype(parent, nativeHTMLStyleElement, (style) =>
						rewriteStyle(style)
					);
				});
			});
		}

		// 'remove' is a bad hook, can't figure out what the style owner is
		for (const triggersRender of ['replaceWith', 'replaceData']) {
			(CharacterData.prototype as any)[triggersRender] =
				proxyModule.wrapFunction(
					(CharacterData.prototype as any)[triggersRender],
					(target, that, args) => {
						const result = Reflect.apply(target, that, args);

						textUpdated(that);

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
				(target, that, args) => {
					Reflect.apply(target, that, args);

					textUpdated(that);
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

					textUpdated(that);
				}),
			});
		}

		// eslint-disable-next-line @typescript-eslint/ban-types
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
					// console.log(inserted);
					// may be an incompatible interface, we don't know;
				}

				return Reflect.apply(target, that, args);
			});

		Node.prototype.appendChild = willInsertNode(Node.prototype.appendChild);
		Element.prototype.append = willInsertNode(Element.prototype.append);
		Node.prototype.insertBefore = willInsertNode(Node.prototype.insertBefore);
		Node.prototype.replaceChild = willInsertNode(Node.prototype.replaceChild);
		Element.prototype.replaceWith = willInsertNode(
			Element.prototype.replaceWith
		);
	}
}
