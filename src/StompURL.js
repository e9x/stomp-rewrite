export default class StompURL {
	/**
	 *
	 * @param {string|url} url
	 * @param {import('./Codecs.js').default | StompURL} codec
	 * @param {string?} directory
	 */
	constructor(url, codec, directory) {
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
