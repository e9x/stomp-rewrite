export default class StompURL {
	constructor(url, codec) {
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
//# sourceMappingURL=StompURL.js.map
