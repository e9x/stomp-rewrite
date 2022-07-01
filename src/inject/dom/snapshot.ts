import { cloneInstance } from '../snapshot';

export class DOMParser extends global.DOMParser {}

Object.defineProperties(
	DOMParser.prototype,
	Object.getOwnPropertyDescriptors(global.DOMParser)
);

export const navigator = cloneInstance(global.navigator, Navigator.prototype);
