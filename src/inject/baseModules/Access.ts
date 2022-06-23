import { UNDEFINABLE } from '../../rewriteJS';
import Module from '../Module';

export const ACCESS_KEY = '$s$j';

export const GLOBAL_PROXY = '$s$L';

/*
// why was this necessary?
function normalizeKey(key: unknown): string|unknown {
	if (typeof key === 'string') {
		return key;
	} else if(typeof key === 'u') {
		return '';
	}
}*/

interface GlobalObject {
	[GLOBAL_PROXY]?: unknown;
}

export function setGlobalProxy(object: any, proxy: unknown) {
	object[GLOBAL_PROXY] = proxy;
}

export default class AccessModule extends Module {
	apply() {
		const api = {
			get2: (
				target: { [key: string | number]: unknown | GlobalObject },
				key: string | number
			): unknown => {
				// key = normalizeKey(key);
				return api.get(<GlobalObject>target[key], key);
			},
			get: (object: GlobalObject, key: string | number): unknown => {
				if (
					typeof key === 'string' &&
					UNDEFINABLE.includes(key) &&
					((typeof object === 'object' && object !== null) ||
						typeof object === 'function') &&
					GLOBAL_PROXY in object
				) {
					return object[GLOBAL_PROXY];
				}

				return object;
			},
		};

		(global as { [key: string]: unknown })[ACCESS_KEY] = api;
	}
}
