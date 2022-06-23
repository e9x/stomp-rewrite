import GenericCodec from './Codecs';

export declare type urlLike = URL | string;

export default class StompURL {
	codec: GenericCodec;
	directory: string;
	url: URL;
	constructor(
		url: urlLike,
		codec: GenericCodec | StompURL,
		directory?: string
	) {
		if (codec instanceof StompURL) {
			const copy = codec;
			codec = copy.codec;
			directory = copy.directory;
		}

		if (typeof url === 'string') {
			this.url = new URL(url);
		} else if (url instanceof URL) {
			this.url = url;
		} else {
			throw new TypeError('Unknown overload');
		}

		if (typeof directory !== 'string') {
			throw new TypeError(`Directory wasn't string`);
		}

		this.codec = codec;
		this.directory = directory;
	}
	encode() {
		// hash isn't encoded
		return this.codec.encode(
			this.url.origin + this.url.pathname + this.url.search
		);
	}
	toString() {
		return this.url.toString();
	}
}
