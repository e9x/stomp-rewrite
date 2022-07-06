const VALID_NAME = /^[a-z0-9]*$/i;

const specimen = Object.toString();
const name = 'Object';
const occurs = specimen.indexOf(name);

export const nativeLeft = specimen.slice(0, occurs);
export const nativeRight = specimen.slice(occurs + name.length);

export function nativeFunction(name: string) {
	return `${nativeLeft}${name}${nativeRight}`;
}

export function isNative(source: string) {
	if (!source.startsWith(nativeLeft)) return false;
	const rightIndex = source.indexOf(nativeRight);
	if (rightIndex === -1) return false;
	let name = source.slice(nativeLeft.length, rightIndex);
	if (name.startsWith('get ') || name.startsWith('set ')) name = name.slice(4);
	if (!VALID_NAME.test(name)) return false;
	return true;
}
