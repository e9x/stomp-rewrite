import GenericCodec from './Codecs';

export declare type urlLike = URL | string;

export function isUrlLike(object: unknown): object is urlLike {
	return (
		typeof object === 'string' ||
		(typeof object === 'object' && object instanceof URL)
	);
}

export default class StompURL {
	codec: GenericCodec;
	directory: string;
	url: URL;
	constructor(url: urlLike, reference: StompURL);
	constructor(url: urlLike, codec: GenericCodec, directory: string);

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

		if (isUrlLike(url)) {
			this.url = new URL(url);
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
		return (
			this.codec.encode(this.url.origin + this.url.pathname + this.url.search) +
			this.url.hash
		);
	}
	toString() {
		return this.url.toString();
	}
}
