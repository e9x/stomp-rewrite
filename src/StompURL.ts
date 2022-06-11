import Codec from './Codecs.js';

export default class StompURL {
	url: URL;
	codec: Codec;
	constructor(url: URL | string, codec: Codec) {
		if (typeof url === 'string') {
			this.url = new URL(url);
		} else if (url instanceof URL) {
			this.url = url;
		} else {
			throw new TypeError('Unknown overload');
		}

		this.codec = codec;
	}
	encode() {
		return this.codec.encode(this.url.toString());
	}
}
