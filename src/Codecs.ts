const encodeChar = '$';
const validChars =
	'-_~:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function validCodecURI(uri: string) {
	for (let i = 0; i < uri.length; i++) {
		if (!validChars.includes(uri[i])) {
			return false;
		}
	}
	return true;
}

export function encodeCodecURI(input: string) {
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

export function decodeCodecURI(uri: string) {
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

import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

export default class GenericCodec {
	key: string;
	constructor(key: string) {
		this.key = key;
	}
	static generateKey(): string {
		return '';
	}
	encode(input: string): string {
		return encodeCodecURI(input);
	}
	decode(input: string): string {
		return decodeCodecURI(input);
	}
}

const URI_max = 0x7f;
const URI_min = 0x01;

export class XORCodec extends GenericCodec {
	get frequency(): number {
		return parseInt(this.key, 16) & 0xf;
	}
	get xor(): number {
		return parseInt(this.key, 16) >> 0x4;
	}
	static generateKey(): string {
		const xor = ~~(Math.random() * (URI_max - URI_min)) + URI_min;
		// 2-4
		const frequency = Math.min(~~(Math.random() * 0xf), 4);
		// SHORT xor
		// CHAR frequency
		return ((xor << 4) + frequency).toString(16);
	}
	encode(input: string): string {
		let result = '';
		for (let i = 0; i < input.length; i++) {
			if (i % this.frequency === 0) {
				const char = (input.charCodeAt(i) ^ this.xor) + URI_min;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}
		return encodeCodecURI(result);
	}
	decode(input: string): string {
		input = decodeCodecURI(input);
		let result = '';
		for (let i = 0; i < input.length; i++) {
			if (i % this.frequency === 0) {
				const char = (input.charCodeAt(i) - URI_min) ^ this.xor;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}
		return result;
	}
}
export class AESCodec extends GenericCodec {
	static generateKey(): string {
		return Math.random().toString(36).slice(2);
	}
	encode(input: string): string {
		const result = AES.encrypt(input, this.key).toString();
		return encodeCodecURI(result);
	}
	decode(input: string): string {
		input = decodeCodecURI(input);
		return AES.decrypt(input, this.key).toString(Utf8);
	}
}
