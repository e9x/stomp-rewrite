const encodeChar = '$';
const validChars =
	'-_~:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function validCodecURI(uri) {
	for (let i = 0; i < uri.length; i++) {
		if (!validChars.includes(uri[i])) {
			return false;
		}
	}
	return true;
}
export function encodeCodecURI(input) {
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		if (validChars.includes(char) && char !== encodeChar) {
			result += char;
		} else {
			const code = input.charCodeAt(i);
			result += encodeChar + code.toString(16).padStart(2, '0');
		}
	}
	return result;
}
export function decodeCodecURI(uri) {
	let result = '';
	for (let i = 0; i < uri.length; i++) {
		const char = uri[i];
		if (char === encodeChar) {
			const code = parseInt(uri.slice(i + 1, i + 3), 16);
			const decoded = String.fromCharCode(code);
			result += decoded;
			i += 2;
		} else {
			result += char;
		}
	}
	return result;
}
import AES from 'crypto-js/aes.js';
import Utf8 from 'crypto-js/enc-utf8.js';
class CodecBase {
	constructor(key) {
		this.key = key;
	}
}
export class PlainCodec extends CodecBase {
	static generateKey() {
		return '';
	}
	encode(input) {
		return input;
	}
	decode(input) {
		return input;
	}
}
const URI_max = 0x7f;
const URI_min = 0x01;
export class XORCodec extends CodecBase {
	get frequency() {
		return parseInt(this.key, 16) & 0xf;
	}
	get xor() {
		return parseInt(this.key, 16) >> 0x4;
	}
	static generateKey() {
		const xor = ~~(Math.random() * (URI_max - URI_min)) + URI_min;
		// 2-4
		const frequency = Math.min(~~(Math.random() * 0xf), 4);
		// SHORT xor
		// CHAR frequency
		return ((xor << 4) + frequency).toString(16);
	}
	encode(input) {
		console.log(this.xor, this.frequency);
		let result = '';
		for (let i = 0; i < input.length; i++) {
			if (i % this.frequency == 0) {
				const char = (input.charCodeAt(i) ^ this.xor) + URI_min;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}
		return encodeCodecURI(result);
	}
	decode(input) {
		input = decodeCodecURI(input);
		let result = '';
		for (let i = 0; i < input.length; i++) {
			if (i % this.frequency == 0) {
				const char = (input.charCodeAt(i) - URI_min) ^ this.xor;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}
		return result;
	}
}
export class AESCodec extends CodecBase {
	static generateKey() {
		return Math.random().toString();
	}
	encode(input) {
		const result = AES.encrypt(input, this.key).toString();
		return encodeCodecURI(result);
	}
	decode(input) {
		input = decodeCodecURI(input);
		return AES.decrypt(input, this.key).toString(Utf8);
	}
}
