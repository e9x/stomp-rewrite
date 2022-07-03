import { modifyCSS } from '../../../rewriteCSS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	usePrototype,
} from '../../modules/Proxy';
import DocumentClient from '../Client';
import { CustomElement, nativeElement, nativeNode } from './DOM';

export const nativeHTMLElement = Object.create(nativeElement);
export const nativeHTMLStyleElement = Object.create(nativeHTMLElement);
export const nativeText = Object.create(nativeNode);

applyDescriptors(nativeText, Text.prototype);
applyDescriptors(nativeHTMLElement, HTMLElement.prototype);
applyDescriptors(nativeHTMLStyleElement, HTMLStyleElement.prototype);

export default class DOMContentModule extends Module<DocumentClient> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const rewriteSheet = (sheet: CSSStyleSheet) => {
			const rules = [...sheet.cssRules];

			for (let i = 0; i < rules.length; i++) {
				sheet.deleteRule(rules.length - i - 1);
			}

			for (const rule of rules) {
				sheet.insertRule(modifyCSS(rule.cssText, this.client.url), 0);
			}
		};

		const pendingRenderRewrite = Math.random().toString(36).slice(2);

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations)
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLStyleElement)) continue;

					if (node.dataset[pendingRenderRewrite]) {
						delete node.dataset.pendingRenderRewrite;

						usePrototype(node, nativeHTMLStyleElement, (style) => {
							rewriteSheet(style.sheet!);
						});
					}
				}
		});

		observer.observe(document, {
			childList: true,
			subtree: true,
		});

		const reRender = (style: HTMLStyleElement) => {
			if (style.sheet) {
				rewriteSheet(style.sheet);
			} else {
				style.dataset[pendingRenderRewrite] = 'true';
			}
		};

		function textUpdated(element: Text) {
			usePrototype(element, nativeText, (text: Text) => {
				if (!text.parentElement) {
					return;
				}

				usePrototype(text.parentElement, CustomElement.prototype, (parent) => {
					if (parent.nodeName === 'STYLE') {
						usePrototype(parent, nativeHTMLStyleElement, (style) => {
							reRender(style);
						});
					}
				});
			});
		}

		function nodeUpdated(node: Node) {
			usePrototype(node, nativeNode, (node: Node) => {
				if (node.nodeName === 'STYLE') {
					usePrototype(node, nativeHTMLStyleElement, (style) => {
						reRender(style);
					});
				}
			});
		}

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

		const nodeValueDescriptor = Reflect.getOwnPropertyDescriptor(
			Node.prototype,
			'nodeValue'
		)!;

		Reflect.defineProperty(Node.prototype, 'nodeValue', {
			enumerable: true,
			configurable: true,
			get: nodeValueDescriptor.get,
			set: proxyModule.wrapFunction(
				nodeValueDescriptor.set!,
				(target, that, args) => {
					Reflect.apply(target, that, args);

					textUpdated(that);
				}
			),
		});

		Node.prototype.cloneNode = proxyModule.wrapFunction(
			Node.prototype.cloneNode,
			(target, that, args) => {
				const result = Reflect.apply(target, that, args);

				usePrototype(result, nativeNode, (node) => {
					if (node.nodeName === 'STYLE') {
						reRender(node);
					}
				});

				return result;
			}
		);

		Node.prototype.appendChild = proxyModule.wrapFunction(
			Node.prototype.appendChild,
			(target, that, args) => {
				const result = Reflect.apply(target, that, args);

				nodeUpdated(that);

				return result;
			}
		);

		Element.prototype.append = proxyModule.wrapFunction(
			Element.prototype.append,
			(target, that, args) => {
				const result = Reflect.apply(target, that, args);

				nodeUpdated(that);

				return result;
			}
		);
	}
}
