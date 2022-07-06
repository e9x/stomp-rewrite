/* eslint-disable @typescript-eslint/ban-types */
import { restoreJS } from '../../rewriteJS';
import Client from '../Client';
import Module from '../Module';
import { isNative } from '../nativeUtil';

// import { getOwnPropertyDescriptors, mirror_attributes } from './rewriteUtil.js';

export const cleanupPrototype = Symbol();
export const preparePrototype = Symbol();
/*
 * Sets the prototype of an object while this script is working with it. This is to ensure we are only accessing the native functions and not any traps/shims.
 */
export function usePrototype<Prototype extends object, CallbackResult>(
	target: object,
	usePrototype: Prototype,
	callback: (object: Prototype) => CallbackResult
): CallbackResult {
	const prototype = Reflect.getPrototypeOf(target);
	Reflect.setPrototypeOf(target, usePrototype);

	const uses = <
		{ [preparePrototype]?: () => void; [cleanupPrototype]?: () => void }
	>target;

	if (uses[preparePrototype]) {
		uses[preparePrototype]();
	}

	let result: any[] = [];

	{
		const set = <Prototype>target;

		try {
			result = [callback(set)];
		} catch (error) {
			result = [undefined, error];
		}
	}

	if (uses[cleanupPrototype]) {
		uses[cleanupPrototype]();
	}

	Reflect.setPrototypeOf(target, prototype);

	if (result.length === 2) {
		throw result[1];
	}

	return result[0];
}

export function applyDescriptors(target: any, from: any): any {
	Object.defineProperties(target, Object.getOwnPropertyDescriptors(from));
}

export function invokeGlobal(that: any, check: any) {
	if (that !== check) {
		throw new TypeError('Illegal invocation');
	}
}

export function classConstant(target: any, key: string, value: any) {
	const descriptor = {
		configurable: false,
		writable: false,
		enumerable: true,
		value,
	};

	Reflect.defineProperty(target, key, descriptor);
	Reflect.defineProperty(target.prototype, key, descriptor);
}

export function onEventTarget(target: any, event: string) {
	const property = `on${event}`;
	const listeners = new WeakMap();

	Reflect.defineProperty(target, property, {
		enumerable: true,
		configurable: true,
		get() {
			if (listeners.has(this)) {
				return listeners.get(this);
			} else {
				return null;
			}
		},
		set(value) {
			if (typeof value === 'function') {
				if (listeners.has(this)) {
					this.removeEventListener(event, listeners.get(this));
				}

				listeners.set(this, value);
				this.addEventListener(event, value);
			}

			return value;
		},
	});
}

export function domObjectConstructor(original: Function) {
	function result(...args: any[]) {
		if (new.target) {
			return Reflect.construct(original, args, new.target);
		} else {
			throw new TypeError(
				`Failed to construct '${original.name}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`
			);
		}
	}

	result.prototype = original.prototype;
	result.prototype.constructor = result;

	return result;
}

/**
 * Throws a generic argument error.
 * @example
 * catchRequiredArguments([].length, 1, "Window", "fetch"); // TypeError: Failed to execute 'fetch' on 'Window': 1 argument required, but only 0 present.
 */
export function catchRequiredArguments(
	args: number,
	requiredArguments: number,
	on: string,
	api: string
) {
	if (args < requiredArguments) {
		throw new TypeError(
			`Failed to execute '${api}' on '${on}: ${
				requiredArguments === 1
					? '1 argument required'
					: `${requiredArguments} required`
			}, but only ${args} present.`
		);
	}
}

export function contextThis(that: unknown): unknown {
	if (that === undefined || that === null) {
		return global;
	} else {
		return that;
	}
}

export default class ProxyModule extends Module<Client> {
	functionStrings = new WeakMap<Function, string>();
	apply() {
		Function.prototype.toString = this.wrapFunction(
			Function.prototype.toString,
			(target, that, args) => {
				if (this.functionStrings.has(that))
					return this.functionStrings.get(that);
				else {
					let string = Reflect.apply(target, that, args);

					if (!isNative(string)) {
						let start = 0;
						if (!string.startsWith('function ')) {
							start = 'function '.length;
							string = 'function ' + string;
						}

						string = restoreJS(string, this.client.url);
						string = string.slice(start);
					}

					return string;
				}
			}
		);
	}
	bindNatives(target: object, natives: WeakMap<object, object>) {
		const bindNative = <T extends Function>(target: T) =>
			this.wrapFunction(target, (target, that, args) =>
				Reflect.apply(
					target,
					natives.has(that) ? natives.get(that) : that,
					args
				)
			);

		for (const prop of Object.getOwnPropertyNames(target)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(target, prop)!;

			if (!descriptor?.configurable) continue;

			if (descriptor.value) descriptor.value = bindNative(descriptor.value);
			if (descriptor.get) descriptor.get = bindNative(descriptor.get);
			if (descriptor.set) descriptor.set = bindNative(descriptor.set);

			Reflect.defineProperty(target, prop, descriptor);
		}
	}
	mirrorClass(from: any, to: any, instances: WeakSet<any>) {
		Reflect.defineProperty(to.prototype, Symbol.toStringTag, {
			configurable: true,
			enumerable: false,
			writable: false,
			value: from.prototype[Symbol.toStringTag],
		});

		this.mirrorAttributes(from, to);

		const descriptors = Object.getOwnPropertyDescriptors(to.prototype);
		const mirrorDescriptors = Object.getOwnPropertyDescriptors(from.prototype);

		for (const key in descriptors) {
			const descriptor = descriptors[key];

			const mirrorDescriptor = mirrorDescriptors[key];

			if (!mirrorDescriptor) {
				console.warn('Key not present in global:', key);
				continue;
			}

			if (!descriptor?.configurable) continue;

			if (typeof descriptor.value === 'function')
				mirrorDescriptor.value = this.wrapFunction(
					mirrorDescriptor.value,
					(target, that, args) => {
						if (!instances.has(that)) {
							throw new TypeError('Illegal Invocation');
						}

						return Reflect.apply(descriptor.value, that, args);
					}
				);
			else if ('value' in descriptor) mirrorDescriptor.value = descriptor.value;

			if (typeof descriptor.get === 'function')
				mirrorDescriptor.get = this.wrapFunction(
					mirrorDescriptor.get!,
					(target, that, args) => {
						if (!instances.has(that)) {
							throw new TypeError('Illegal Invocation');
						}

						return Reflect.apply(descriptor.get!, that, args);
					}
				);

			if (typeof descriptor.set === 'function')
				mirrorDescriptor.set = this.wrapFunction(
					mirrorDescriptor.set!,
					(target, that, args) => {
						if (!instances.has(that)) {
							throw new TypeError('Illegal Invocation');
						}

						return Reflect.apply(descriptor.set!, that, args);
					}
				);

			Reflect.defineProperty(to.prototype, key, mirrorDescriptor);
		}
	}
	mirrorAttributes<F extends Function, T extends Function>(from: F, to: T): T {
		this.functionStrings.set(to, from.toString());

		Reflect.defineProperty(to, 'length', {
			configurable: true,
			enumerable: false,
			value: from.length,
			writable: false,
		});

		Reflect.defineProperty(to, 'name', {
			configurable: true,
			enumerable: false,
			value: from.name,
			writable: false,
		});

		return to;
	}
	wrapFunction<T extends Function>(
		fn: T,
		wrap: (target: T, that: any, args: any[], newTarget?: any) => any,
		construct = false
	): T {
		const wrapped =
			'prototype' in fn
				? function attach(this: any, ...args: any[]) {
						let newTarget: Function = new.target;

						if (construct) {
							if (new.target === undefined) {
								// should throw an error if fn was a class
								throw new Error('Placeholder');
								// fn();
							} else if (new.target === wrapped) {
								newTarget = fn;
								Reflect.setPrototypeOf(this, fn.prototype);
								this.constructor = fn;
							}
						}

						// @ts-ignore
						return wrap(fn, this, args, newTarget);
				  }
				: {
						attach(this: any, ...args: any[]) {
							return wrap(fn, this, args);
						},
				  }.attach;

		this.mirrorAttributes(fn, wrapped);

		if (construct) {
			wrapped.prototype = fn.prototype;

			const descriptor = Reflect.getOwnPropertyDescriptor(
				wrapped.prototype,
				'constructor'
			)!;

			Reflect.defineProperty(wrapped.prototype, 'constructor', {
				...descriptor,
				value: wrapped,
			});
		}

		return <T>(<unknown>wrapped);
	}
}
