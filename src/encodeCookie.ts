// https://stackoverflow.com/a/45536811

const validChars =
	"abdefghijklmnqrstuvxyzABDEFGHIJKLMNQRSTUVXYZ0123456789!#$%&'()*+-./:<>?@[]^_`{|}~";
const reserveChar = '%';

export function validCookie(cookie: string): boolean {
	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (!validChars.includes(char)) {
			return false;
		}
	}

	return true;
}

export function encodeCookie(cookie: string): string {
	let result = '';

	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (validChars.includes(char) && char !== reserveChar) {
			result += char;
		} else {
			const code = char.charCodeAt(0);
			result += reserveChar + code.toString(16).padStart(2, '0');
		}
	}

	return result;
}

export function decodeCookie(cookie: string): string {
	let result = '';

	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (char === reserveChar) {
			const code = parseInt(cookie.slice(i + 1, i + 3), 16);
			const decoded = String.fromCharCode(code);

			result += decoded;
			i += 2;
		} else {
			result += char;
		}
	}

	return result;
}
