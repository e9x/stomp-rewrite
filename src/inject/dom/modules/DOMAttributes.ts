import StompURL from '../../../StompURL';
import { modifyCSS, routeCSS } from '../../../rewriteCSS';
import { modifyRefresh, routeHTML } from '../../../rewriteHTML';
import { routeJS, ScriptType } from '../../../rewriteJS';
import { routeManifest } from '../../../rewriteManifest';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import DocumentClient from '../Client';
import DOMHooksModule, { CustomElement } from './DOMHooks';
import { parseSrcset, stringifySrcset } from 'srcset';

const jsTypes = ['text/javascript', 'application/javascript', 'module', ''];

export function shouldRewriteScript(element: Element) {
	return jsTypes.includes(element.getAttribute('type') || '');
}

export function scriptType(element: Element): ScriptType {
	return element.getAttribute('type') === 'module'
		? 'genericModule'
		: 'generic';
}

export default class DOMAttributesModule extends Module<DocumentClient> {
	formHook?: (element: CustomElement) => void;
	apply() {
		const domHooksModule = this.client.getModule(DOMHooksModule)!;

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('href');

				if (
					element.hasAttribute('href') &&
					element.getAttribute('href') !== ''
				) {
					element.setAttributeOG('href', element.getAttribute('href')!);
					element.setAttribute(
						'href',
						routeHTML(
							new StompURL(
								new URL(
									element.getAttribute('href')!,
									this.client.url.toString()
								),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				}
			},
			[
				['A', 'href'],
				[
					HTMLAnchorElement,
					'href',
					(element) =>
						element.hasAttribute('href') &&
						element.getAttribute('href') !== '' &&
						new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString(),
				],
			]
			// URL attributes do not mixin with element attributes
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('src');

				if (
					element.hasAttribute('src') &&
					element.getAttribute('src') !== '' &&
					shouldRewriteScript(element)
				) {
					element.setAttributeOG('src', element.getAttribute('src')!);
					element.setAttribute(
						'src',
						routeJS(
							new StompURL(
								new URL(
									element.getAttribute('src')!,
									this.client.url.toString()
								),
								this.client.url
							),
							this.client.url,
							this.client.config,
							scriptType(element)
						)
					);
				}
			},
			[
				['SCRIPT', 'src'],
				[
					HTMLScriptElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('integrity');

				if (element.hasAttribute('integrity')) {
					element.setAttributeOG(
						'integrity',
						element.getAttribute('integrity')!
					);
					element.removeAttribute('integrity');
				}
			},
			[
				['LINK', 'integrity'],
				['SCRIPT', 'integrity'],
				[
					HTMLLinkElement,
					'integrity',
					(element) =>
						element.hasAttribute('integrity') &&
						element.getAttribute('integrity') !== '' &&
						element.getAttributeOG('integrity')!,
				],
				[
					HTMLScriptElement,
					'integrity',
					(element) =>
						element.hasAttribute('integrity') &&
						element.getAttribute('integrity') !== '' &&
						element.getAttributeOG('integrity')!,
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('href');

				if (
					element.hasAttribute('href') &&
					element.hasAttribute('rel') &&
					element.getAttribute('href') !== ''
				) {
					switch (element.getAttribute('rel')) {
						case 'stylesheet':
							element.setAttributeOG('href', element.getAttribute('href')!);
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
						case 'manifest':
							element.setAttributeOG('href', element.getAttribute('href')!);
							element.setAttribute(
								'href',
								routeManifest(
									new StompURL(
										new URL(
											element.getAttribute('href')!,
											this.client.url.toString()
										),
										this.client.url
									),
									this.client.url,
									this.client.config
								)
							);
							break;
						default:
							element.setAttributeOG('href', element.getAttribute('href')!);
							element.setAttribute(
								'href',
								routeBinary(
									new StompURL(
										new URL(
											element.getAttribute('href')!,
											this.client.url.toString()
										),
										this.client.url
									)
								)
							);
							break;
					}
				}
			},
			[
				['LINK', 'href'],
				['LINK', 'rel'],
				[
					HTMLLinkElement,
					'href',
					(element) =>
						element.hasAttribute('href') &&
						element.getAttribute('href') !== '' &&
						new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString(),
				],
				[HTMLLinkElement, 'rel', () => false],
			]
		);

		// todo: mimes...?
		// https://www.w3schools.com/tags/tag_embed.asp

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('src');

				if (element.hasAttribute('src') && element.getAttribute('src') !== '') {
					element.setAttributeOG('src', element.getAttribute('src')!);
					element.setAttribute(
						'src',
						routeHTML(
							new StompURL(
								new URL(
									element.getAttribute('src')!,
									this.client.url.toString()
								),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				}
			},
			[
				['IFRAME', 'src'],
				['EMBED', 'src'],
				[
					HTMLIFrameElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],

				[
					HTMLEmbedElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('content');

				if (
					element.hasAttribute('content') &&
					element.getAttribute('content') !== '' &&
					element.getAttribute('http-equiv') === 'refresh'
				) {
					element.setAttributeOG('content', element.getAttribute('content')!);
					element.setAttribute(
						'content',
						modifyRefresh(
							element.getAttribute('content')!,
							this.client.url,
							this.client.config
						)
					);
				}
			},
			[
				['META', 'content'],
				['META', 'http-equiv'],
				[
					HTMLMetaElement,
					'content',
					(element) =>
						element.hasAttribute('content') &&
						element.getAttribute('content') !== '' &&
						new URL(
							element.getAttributeOG('content')!,
							this.client.url.toString()
						).toString(),
				],
				[HTMLMetaElement, 'httpEquiv', () => false],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('src');

				if (element.hasAttribute('src') && element.getAttribute('src') !== '') {
					element.setAttributeOG('src', element.getAttribute('src')!);
					element.setAttribute(
						'src',
						routeBinary(
							new StompURL(
								new URL(
									element.getAttribute('src')!,
									this.client.url.toString()
								),
								this.client.url
							)
						)
					);
				}
			},
			[
				['IMG', 'src'],
				[
					HTMLImageElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('srcset');

				if (
					element.hasAttribute('srcset') &&
					element.getAttribute('srcset') !== ''
				) {
					element.setAttributeOG('srcset', element.getAttribute('srcset')!);

					const parsed = parseSrcset(element.getAttribute('srcset')!);
					const updated: { url: string; width?: number; density?: number }[] =
						[];

					for (const src of parsed) {
						updated.push({
							...src,
							url: routeBinary(
								new StompURL(
									new URL(src.url, this.client.url.toString()),
									this.client.url
								)
							),
						});
					}

					element.setAttribute('srcset', stringifySrcset(updated));
				}
			},
			[
				['IMG', 'srcset'],
				['SOURCE', 'srcset'],
				[
					HTMLImageElement,
					'srcset',
					(element) =>
						element.hasAttribute('srcset') &&
						element.getAttribute('srcset') !== '' &&
						element.getAttributeOG('srcset')!,
				],
				[
					HTMLSourceElement,
					'srcset',
					(element) =>
						element.hasAttribute('srcset') &&
						element.getAttribute('srcset') !== '' &&
						element.getAttributeOG('srcset')!,
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('src');

				if (element.hasAttribute('src') && element.getAttribute('src') !== '') {
					element.setAttributeOG('src', element.getAttribute('src')!);
					element.setAttribute(
						'src',
						routeBinary(
							new StompURL(
								new URL(
									element.getAttribute('src')!,
									this.client.url.toString()
								),
								this.client.url
							)
						)
					);
				}
			},
			[
				['AUDIO', 'src'],
				['VIDEO', 'src'],
				['SOURCE', 'src'],
				[
					HTMLMediaElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
				[
					HTMLSourceElement,
					'src',
					(element) =>
						element.hasAttribute('src') &&
						element.getAttribute('src') !== '' &&
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('style');

				if (
					element.hasAttribute('style') &&
					element.getAttribute('style') !== ''
				) {
					element.setAttributeOG('style', element.getAttribute('style')!);
					element.setAttribute(
						'style',
						modifyCSS(
							element.getAttributeOG('style')!,
							this.client.url,
							'declarationList'
						)
					);
				}
			},
			// CSSStyleDeclaration: CSSStyleRule.prototype.style, HTMLElement.prototype.style( in hooks, getter)
			// TODO: hook CSSStyleDeclaration
			[[HTMLElement, 'style', () => false]]
		);

		const validMethods = ['GET', 'POST'];

		this.formHook = (element) => {
			element.restoreOG('action');

			// if (appendHook) {
			if (
				element.hasAttribute('action') &&
				element.getAttribute('action') !== ''
			) {
				element.setAttributeOG('action', element.getAttribute('action')!);
			}
			// }

			/**
			 * Absolute URL
			 */
			const action = element.hasAttributeOG('action')
				? new URL(
						element.getAttributeOG('action')!,
						this.client.url.toString()
				  ).toString()
				: this.client.url.toString();

			const methodIndex = validMethods.indexOf(
				element.getAttribute('method')?.toUpperCase() || ''
			);
			const method = validMethods[methodIndex === -1 ? 0 : methodIndex];

			switch (method) {
				case 'GET':
					element.setAttribute(
						'action',
						routeHTML(
							new StompURL(action, this.client.url),
							this.client.url,
							this.client.config,
							true
						)
					);
					break;
				case 'POST':
					element.setAttribute(
						'action',
						routeHTML(
							new StompURL(action, this.client.url),
							this.client.url,
							this.client.config
						)
					);

					break;
			}
		};

		domHooksModule.useAttributes(this.formHook, [
			['FORM', 'action'],
			['FORM', 'method'],
			[
				HTMLFormElement,
				'action',
				(element) =>
					element.hasAttribute('action') &&
					element.getAttribute('action') !== '' &&
					new URL(
						element.getAttributeOG('action')!,
						this.client.url.toString()
					).toString(),
			],
			[HTMLFormElement, 'method', () => false],
		]);

		domHooksModule.useAttributes(
			(element) => {
				element.restoreOG('href');

				if (
					element.hasAttribute('href') &&
					element.getAttribute('href') !== ''
				) {
					element.setAttributeOG('href', element.getAttribute('href')!);
					element.setAttribute(
						'href',
						routeHTML(
							new StompURL(
								new URL(
									element.getAttribute('href')!,
									this.client.url.toString()
								),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				}
			},
			[
				['BASE', 'href'],
				[
					HTMLBaseElement,
					'href',
					(element) =>
						element.hasAttribute('href') &&
						element.getAttribute('href') !== '' &&
						new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);
	}
}
