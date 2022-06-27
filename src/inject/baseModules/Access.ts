/* eslint-disable @typescript-eslint/ban-types */
import StompURL from '../../StompURL';
import { urlLike } from '../../StompURL';
import { routeHTML } from '../../rewriteHTML';
import { modifyJS, routeJS, UNDEFINABLE } from '../../rewriteJS';
import Client from '../Client';
import Module from '../Module';
import ProxyModule from './Proxy';

export const ACCESS_KEY = '$s$j';

export const GLOBAL_PROXY = '$s$L';
export const GLOBAL_NAME = '$s$N';

/*
// why was this necessary?
function normalizeKey(key: unknown): string|unknown {
	if (typeof key === 'string') {
		return key;
	} else if(typeof key === 'u') {
		return '';
	}
}*/

const evalSnapshot = global.eval;

export function setGlobalProxy(object: any, name: string, proxy: unknown) {
	object[GLOBAL_PROXY] = proxy;
	object[GLOBAL_NAME] = name;
}

export default class AccessModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule);

		const globalEval = (x: string) => {
			x = String(x);
			return evalSnapshot(modifyJS(x, this.client.url));
		};

		const globalEvalProxy = proxyModule?.wrapFunction(
			evalSnapshot,
			(target, that, [code]) => globalEval(code)
		);

		const api = {
			get2: (target: any, key: any): unknown => {
				// key = normalizeKey(key);
				return api.get(target[key], key);
			},
			get: (object: any, key: any): any => {
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
			set2: (
				target: any,
				key: any,
				operate: (target: any, property: any, value: any) => any,
				righthand: any
			) => {
				// key = this.normalize_key(key);
				// possibly a context

				if (typeof key === 'string') {
					if (target === global) {
						if (key === 'location') {
							target = (location as any)[GLOBAL_PROXY];
							key = 'href';
						}
					} else if (
						((typeof target === 'object' && target !== null) ||
							typeof target === 'function') &&
						ACCESS_KEY in target
					) {
						return target[ACCESS_KEY]!.set2(target, key, operate);
					}
				}

				return operate(api.get(target, key), key, righthand);
			},
			set1: (
				target: any,
				name: any,
				operate: any,
				set: any,
				righthand: any
			) => {
				// name = normalizeKey(name);
				const proxy = api.get(target, name);

				const property = Symbol();
				const object = {
					[property]: proxy,
				};

				const result = operate(object, property, righthand);
				const value = object[property];

				if (
					typeof target === 'object' &&
					target !== null &&
					target[GLOBAL_NAME] === 'location'
				) {
					set(
						routeHTML(
							new StompURL(
								new URL(<urlLike>value, this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				} else {
					set(value);
				}

				return result;
			},
			new2: (target: any, key: any, args: any): any => {
				// key = normalizeKey(key);
				return Reflect.construct(api.get(target[key], key), args);
			},
			call2: (target: any, key: any, args: any): any => {
				// key = normalizeKey(key);
				return Reflect.apply(api.get(target[key], key), target, args);
			},
			evalScope: (func: Function, code: string | unknown, ...args: any[]) => {
				code = String(code);
				console.log(func);
				if (func === evalSnapshot) {
					return [modifyJS(<string>code, this.client.url)];
				} else {
					// call as if it were eval(the, args, to, non js eval)
					return [code, ...args];
				}
			},
			import: (baseURL: string | undefined, url: string): Promise<unknown> => {
				// @ts-ignore
				return import(
					/* webpackIgnore: true */
					routeJS(
						new StompURL(
							new URL(url, baseURL || this.client.url.toString()),
							this.client.url
						),
						this.client.url,
						true
					)
				);
			},
		};

		(global as { [key: string]: unknown })[ACCESS_KEY] = api;
	}
}
