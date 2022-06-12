export interface ServiceWorkerConfig {
	codec: 'plain' | 'xor' | 'base64';
	scope: string;
	scripts: string;
}
