export class DOMParser extends global.DOMParser {}

Object.defineProperties(
	DOMParser.prototype,
	Object.getOwnPropertyDescriptors(global.DOMParser)
);
