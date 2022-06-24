import StompURL from '../../StompURL';
import { routeCSS } from '../../rewriteCSS';
import { routeHTML } from '../../rewriteHTML';
import { routeBinary } from '../../routeURL';
import Module from '../Module';
import DOMModule from './DOM';

export class DOMHooksModule extends Module {
	apply() {
		const domHooksModule = this.client.getModule(DOMModule)!;

		domHooksModule.useAttributes(
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
			['href', 'rel']
		);

		domHooksModule.useAttributes(
			['IMG'],
			element => {
				if (element.hasAttribute('src')) {
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
			['A'],
			element => {
				if (element.hasAttribute('href')) {
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
	}
}
