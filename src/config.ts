import GenericCodec, { AESCodec, Base64Codec, XORCodec } from './Codecs';
import { BareManifest } from '@tomphttp/bare-client';

export declare type ConfigCodec = 'generic' | 'xor' | 'aes' | 'base64';

export interface Config {
	codec: ConfigCodec;
	directory: string;
	bareServer: string;
	bareClientData?: BareManifest;
}

export interface ParsedConfig extends Omit<Config, 'codec'> {
	codec: GenericCodec;
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
		case 'base64':
			codec = new Base64Codec(codecKey);
			break;
		case 'generic':
		default:
			codec = new GenericCodec(codecKey);
			break;
	}

	return {
		...config,
		codec,
	};
}

export function generateConfigCodecKey(codec: ConfigCodec): string {
	switch (codec) {
		case 'aes':
			return AESCodec.generateKey();
		case 'xor':
			return XORCodec.generateKey();
		case 'base64':
			return Base64Codec.generateKey();
		case 'generic':
		default:
			return GenericCodec.generateKey();
	}
}

export function codecType(codec: GenericCodec): ConfigCodec {
	if (codec instanceof AESCodec) {
		return 'aes';
	} else if (codec instanceof XORCodec) {
		return 'xor';
	} else if (codec instanceof Base64Codec) {
		return 'base64';
	} else {
		return 'generic';
	}
}
