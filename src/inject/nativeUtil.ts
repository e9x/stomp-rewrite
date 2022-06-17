const VALID_NAME = /^[a-z0-9]*$/i;
let nativeLeft: string;
let nativeRight: string;

{
	const specimen = Object.toString();
	const name = 'Object';
	const occurs = specimen.indexOf(name);
	nativeLeft = specimen.slice(0, occurs);
	nativeRight = specimen.slice(occurs + name.length);
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
