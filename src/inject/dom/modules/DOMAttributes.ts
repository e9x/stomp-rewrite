import StompURL from '../../../StompURL';
import { routeCSS } from '../../../rewriteCSS';
import { modifyRefresh, routeHTML } from '../../../rewriteHTML';
import { routeJS } from '../../../rewriteJS';
import { routeManifest } from '../../../rewriteManifest';
import { routeBinary } from '../../../routeURL';
import Module from '../../Module';
import DocumentClient from '../Client';
import DOMModule from './DOM';

export default class DOMHooksModule extends Module<DocumentClient> {
	apply() {
		const domHooksModule = this.client.getModule(DOMModule)!;

		domHooksModule.useAttributes(
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

		domHooksModule.useAttributes(
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

		domHooksModule.useAttributes(
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

		/*domHooksModule.useContent(
			(element) => {
				console.log(element);
				element.textContent = modifyJS(
					element.textContent!,
					this.client.url,
					this.client.config,
					'generic'
				);
			},
			['SCRIPT']
		);*/

		domHooksModule.useAttributes(
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
				[
					HTMLLinkElement,
					'rel',
					(element) =>
						new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString(),
				],
			]
		);

		// todo: mimes...?
		// https://www.w3schools.com/tags/tag_embed.asp

		domHooksModule.useAttributes(
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

		domHooksModule.useAttributes(
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
			]
		);

		domHooksModule.useAttributes(
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

		domHooksModule.useAttributes(
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

		domHooksModule.useAttributes(
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
