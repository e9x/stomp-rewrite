import { Config, ConfigCodec } from '../config';

const currentScript = <HTMLScriptElement>document.currentScript;

export default class Bootstrapper {
	config: Config;
	directory: URL;
	registration?: ServiceWorkerRegistration;
	constructor(config: {
		codec: ConfigCodec;
		directory?: string | URL;
		bareServer: string | URL;
	}) {
		let directory: URL;
		let bareServer: URL;

		if (config.bareServer instanceof URL) {
			bareServer = config.bareServer;
		} else if (typeof config.bareServer === 'string') {
			bareServer = new URL(config.bareServer, location.toString());
		} else {
			throw new TypeError('config.bareServer not specified');
		}

		if (config.directory instanceof URL) {
			directory = config.directory;
		} else if (typeof config.directory === 'string') {
			directory = new URL(config.directory, location.toString());
		} else {
			directory = new URL('.', currentScript.src);
		}

		this.directory = directory;

		this.config = {
			...config,
			bareServer: bareServer.toString(),
			directory: directory.pathname,
		};
	}
	async register() {
		if (this.registration) {
			throw new Error('Already registered');
		}

		if (!('serviceWorker' in navigator))
			throw new Error('Your browser does not support service workers.');

		this.registration = await navigator.serviceWorker.register(
			new URL(
				'serviceWorker.js?' +
					new URLSearchParams({ config: JSON.stringify(this.config) }),
				this.directory
			),
			{
				scope: this.directory.toString(),
				updateViaCache: 'none',
			}
		);
	}
	async navigate(url: string) {
		if (!this.registration) {
			throw new Error('ServiceWorker not registered');
		}

		// create client to make a POST request to process
		// extensions cannot access the POST contents
		// request never reaches a server
		const iframe = document.createElement('iframe');
		iframe.src = new URL('client', this.directory).toString();
		iframe.style.display = 'none';
		document.body.append(iframe);

		iframe.addEventListener('load', async () => {
			const destination = await (
				await iframe.contentWindow!.fetch(new URL('process', this.directory), {
					method: 'POST',
					body: url,
				})
			).text();
			console.log(destination);

			iframe.remove();

			location.href = destination;
		});
	}
}
