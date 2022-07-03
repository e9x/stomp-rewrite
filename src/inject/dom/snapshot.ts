import { bindDescriptors } from '../snapshot';

export class DOMParser extends global.DOMParser {}

Object.defineProperties(
	DOMParser.prototype,
	Object.getOwnPropertyDescriptors(global.DOMParser)
);

export const navigator: Navigator = bindDescriptors(
	{},
	global.navigator,
	Navigator.prototype
);
