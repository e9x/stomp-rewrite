import { restoreJS } from '../../rewriteJS.js';
import Module from '../Module.js';
import { isNative } from '../nativeUtil.js';

export default class ProxyModule extends Module {
	functionStrings = new WeakMap();
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
	// eslint-disable-next-line @typescript-eslint/ban-types
	mirrorAttributes<F extends Function, T extends Function>(
		from: F,
		to: T
	): T {
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
	// eslint-disable-next-line @typescript-eslint/ban-types
	wrapFunction<T extends Function>(
		fn: T,
		wrap: (target: T, that: any, args: any[], newTarget?: any) => any,
		construct = false
	): T {
		const wrapped =
			'prototype' in fn
				? function attach(...args: any[]) {
						let newTarget = new.target;

						if (construct) {
							if (new.target === undefined) {
								// should throw an error if fn was a class
								throw new Error('Placeholder');
								// fn();
							} else if (new.target === wrapped) {
								// @ts-ignore
								newTarget = fn;
								// @ts-ignore
								Reflect.setPrototypeOf(this, fn.prototype);
								// @ts-ignore
								this.constructor = fn;
							}
						}

						// @ts-ignore
						return wrap(fn, this, args, newTarget);
				  }
				: {
						attach(...args: any[]) {
							return wrap(fn, this, args);
						},
				  }['attach'];

		this.mirrorAttributes(fn, wrapped);

		if (construct) {
			wrapped.prototype = fn.prototype;
			wrapped.prototype.constructor = wrapped;
		}

		return <T><unknown>wrapped;
	}
}