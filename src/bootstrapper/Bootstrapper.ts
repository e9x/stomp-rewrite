import { Config, ConfigCodec } from "../config.js";

const currentScript = <HTMLScriptElement>document.currentScript;

export default class Bootstrapper {
	config: Config;
	directory: URL;
	constructor(config: { codec: ConfigCodec, directory?: string | URL, bareServer: string | URL }) {
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
		} else  {
			directory = new URL('.', currentScript.src);
		}



		this.directory = directory;
		
		this.config = {
			...config,
			bareServer: bareServer.toString(),
			directory: directory.pathname,
		}
	}
	async register() {
		if (!('serviceWorker' in navigator))
			throw new Error('Your browser does not support service workers.');
		await navigator.serviceWorker.register(
			new URL(
				'serviceWorker.js?' + new URLSearchParams({ config: JSON.stringify(this.config) }),
				this.directory
			),
			{
				scope: this.directory.toString(),
				updateViaCache: 'none',
			}
		);
	}
	navigate(url: string) {
		const form = document.createElement('form');
		form.action = new URL('process', this.directory).toString();
		form.method = 'POST';
		
		const input = document.createElement('input');
		input.type = 'text';
		input.name = 'url';
		input.value = url;
		form.append(input);

		document.body.append(form);
		form.submit();
		form.remove();
	}
}
