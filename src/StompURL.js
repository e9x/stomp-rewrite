export default class StompURL {
	/**
	 * 
	 * @param {string|url} url
	 * @param {import('./Codecs.js').default} codec
	 * @param {string} directory
	 */
	constructor(url, codec, directory) {
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
		return this.codec.encode(this.url.toString());
	}
	toString() {
		return this.url.toString();
	}
}
