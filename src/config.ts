import GenericCodec, { AESCodec, XORCodec } from './Codecs.js';

export declare type ConfigCodec = 'generic' | 'xor' | 'aes';

export interface Config {
	codec: ConfigCodec;
	directory: string;
}

export interface ParsedConfig {
	codec: GenericCodec;
	directory: string;
}

export function parseConfig(config: Config, codecKey: string): ParsedConfig {
	let codec;

	switch (config.codec) {
		case 'aes':
			codec = new AESCodec(codecKey);
			break;
		case 'xor':
			codec = new XORCodec(codecKey);
			break;
		case 'generic':
		default:
			codec = new GenericCodec(codecKey);
			break;
	}

	return {
		directory: config.directory,
		codec,
	};
}

export function generateConfigCodecKey(codec: ConfigCodec): string {
	switch (codec) {
		case 'aes':
			return AESCodec.generateKey();
			break;
		case 'xor':
			return XORCodec.generateKey();
			break;
		case 'generic':
		default:
			return GenericCodec.generateKey();
			break;
	}
}
