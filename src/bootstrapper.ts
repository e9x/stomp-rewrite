import { ServiceWorkerConfig } from './serviceWorker.js';

export default class Bootstrapper {
	config: ServiceWorkerConfig;
	constructor(config: ServiceWorkerConfig) {
		this.config = config;
	}
	async register() {
		if (!('serviceWorker' in navigator))
			throw new Error('Your browser does not support service workers.');
		await navigator.serviceWorker.register(
			new URL(
				'worker.js?config=' + encodeURIComponent(JSON.stringify(this.config)),
				this.config.scripts
			),
			{
				scope: this.config.scope,
				updateViaCache: 'none',
			}
		);
	}
}
