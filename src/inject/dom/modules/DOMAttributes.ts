import StompURL from '../../../StompURL';
import { modifyCSS, routeCSS } from '../../../rewriteCSS';
import { modifyRefresh, routeHTML } from '../../../rewriteHTML';
import { routeJS } from '../../../rewriteJS';
import { routeManifest } from '../../../rewriteManifest';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import DocumentClient from '../Client';
import DOMModule, { CustomElement } from './DOM';
import { parseSrcset, stringifySrcset } from 'srcset';

export default class DOMAttributesModule extends Module<DocumentClient> {
	formHook?: (element: CustomElement, appendHook?: boolean) => void;
	apply() {
		const domModule = this.client.getModule(DOMModule)!;

		domModule.useAttributes(
			(element) => {
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
					(element) => {
						return new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString();
					},
				],
			]
		);

		domModule.useAttributes(
			(element) => {
				if (element.hasAttribute('src') && element.getAttribute('src') !== '') {
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
							element.getAttribute('type') === 'module'
								? 'genericModule'
								: 'generic'
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
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domModule.useAttributes(
			(element) => {
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
					(element) => element.getAttributeOG('integrity')!,
				],
				[
					HTMLScriptElement,
					'integrity',
					(element) => element.getAttributeOG('integrity')!,
				],
			]
		);

		domModule.useAttributes(
			(element) => {
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

		domModule.useAttributes(
			(element) => {
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
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],

				[
					HTMLEmbedElement,
					'src',
					(element) =>
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domModule.useAttributes(
			(element) => {
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
						new URL(
							element.getAttributeOG('content')!,
							this.client.url.toString()
						).toString(),
				],
				[HTMLMetaElement, 'httpEquiv', () => false],
			]
		);

		domModule.useAttributes(
			(element) => {
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
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domModule.useAttributes(
			(element) => {
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

		domModule.useAttributes(
			(element) => {
				if (element.hasAttribute('src') && element.getAttribute('src') !== '') {
					element.setAttributeOG('src', element.getAttribute('src')!);
					element.setAttribute(
						'src',
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
				}
			},
			[
				['AUDIO', 'src'],
				['SOURCE', 'src'],
				[
					HTMLMediaElement,
					'src',
					(element) =>
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
				[
					HTMLSourceElement,
					'src',
					(element) =>
						new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		domModule.useAttributes(
			(element) => {
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
			[[HTMLElement, 'style', () => false]]
		);

		const validMethods = ['GET', 'POST'];

		this.formHook = (element, appendHook = false) => {
			if (appendHook) {
				if (
					element.hasAttribute('action') &&
					element.getAttribute('action') !== ''
				) {
					element.setAttributeOG('action', element.getAttribute('action')!);
				}
			}

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

		domModule.useAttributes(this.formHook, [
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

		domModule.useAttributes(
			(element) => {
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
						new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);
	}
}
