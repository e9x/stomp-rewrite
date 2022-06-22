import Module from '../Module.js';

export const ACCESS_KEY = '$s$a';

export interface AccessAPI {
	get(a: any): any;
}

export default class AccessModule extends Module {
	apply() {
		const api: AccessAPI = {
			get(a) {
				return a;
			},
		};

		global[ACCESS_KEY] = api;
	}
}
