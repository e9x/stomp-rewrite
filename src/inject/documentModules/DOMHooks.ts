import StompURL from '../../StompURL';
import { routeCSS } from '../../rewriteCSS';
import { modifyRefresh, routeHTML } from '../../rewriteHTML';
import { routeJS } from '../../rewriteJS';
import { routeManifest } from '../../rewriteManifest';
import { routeBinary } from '../../routeURL';
import DocumentClient from '../DocumentClient';
import Module from '../Module';
import DOMModule from './DOM';

export class DOMHooksModule extends Module<DocumentClient> {
	apply() {
		const domHooksModule = this.client.getModule(DOMModule)!;

		domHooksModule.useAttributes(
			['LINK'],
			element => {
				console.log('tripped hook', element);
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
			['href', 'rel'],
			[HTMLLinkElement],
			{
				rel: ['rel'],
				href: [
					'href',
					element => {
						return new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);

		// todo: mimes...?
		// https://www.w3schools.com/tags/tag_embed.asp

		domHooksModule.useAttributes(
			['IFRAME', 'EMBED'],
			element => {
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
			['src'],
			[HTMLIFrameElement, HTMLEmbedElement],
			{
				src: [
					'src',
					element => {
						return new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);

		domHooksModule.useAttributes(
			['META'],
			element => {
				if (
					element.hasAttribute('content') &&
					element.getAttribute('content') !== '' &&
					element.getAttribute('http-equiv') === 'refresh'
				) {
					console.log(element);
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
			['content', 'http-equiv'],
			[HTMLMetaElement],
			{
				content: [
					'content',
					element => {
						return new URL(
							element.getAttributeOG('content')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);

		domHooksModule.useAttributes(
			['IMG'],
			element => {
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
			['src'],
			[HTMLImageElement],
			{
				src: [
					'src',
					element => {
						return new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);

		domHooksModule.useAttributes(
			['SCRIPT'],
			element => {
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
							element.getAttribute('type') === 'module' ? 'domModule' : 'dom'
						)
					);
				}

				if (element.hasAttribute('integrity')) {
					element.removeAttribute('integrity');
				}
			},
			['src', 'integrity'],
			[HTMLScriptElement],
			{
				src: [
					'src',
					element => {
						return new URL(
							element.getAttributeOG('src')!,
							this.client.url.toString()
						).toString();
					},
				],
				integrity: [
					'integrity',
					element => {
						return element.getAttributeOG('integrity')!;
					},
				],
			}
		);

		domHooksModule.useAttributes(
			['A'],
			element => {
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
			['href'],
			[HTMLAnchorElement],
			{
				href: [
					'href',
					element => {
						return new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);

		domHooksModule.useAttributes(
			['BASE'],
			element => {
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
			['href'],
			[HTMLBaseElement],
			{
				href: [
					'href',
					element => {
						return new URL(
							element.getAttributeOG('href')!,
							this.client.url.toString()
						).toString();
					},
				],
			}
		);
	}
}
