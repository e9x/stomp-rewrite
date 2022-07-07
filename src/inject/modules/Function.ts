import { modifyJS } from '../../rewriteJS';
import Client from '../Client';
import Module from '../Module';
import ProxyModule from './Proxy';

/*

const is_class = /^class[{ ]/;
const is_not_member = /=>|^((async\s+)?(\(|function[( ]))/;

		this.global.prototype.toString = wrap_function(
			this.global.prototype.toString,
			(target, that, args) => {
				if (function_strings.has(that)) return function_strings.get(that);
				else {
					let string = Reflect.apply(target, that, args);

					if (!this.client.get(NativeHelper).is_native(string)) {
						if (is_class.test(string)) {
							string = this.client.tomp.js.unwrap(
								`x = ${string}`,
								this.client.base
							);
							string = string.slice(string.indexOf('=') + 1);
							if (string.startsWith(' ')) {
								string = string.slice(1);
							}

							if (string.endsWith(';')) {
								string = string.slice(0, -1);
							}
						} else {
							let left = 0;
							let right;

							if (!is_not_member.test(string)) {
								// (){kind of function}
								left = 1;
								right = -1;
								string = `{${string}}`;
							}

							string = this.client.tomp.js.unwrap(
								`x = ${string}`,
								this.client.base
							);

							string = string.slice(string.indexOf('=') + 1);

							if (string.startsWith(' ')) {
								string = string.slice(1);
							}

							if (string.endsWith(';')) {
								string = string.slice(0, -1);
							}

							string = string.slice(left, right);
						}
					}

					return string;
				}
			}
		);

 */

export default class FunctionModule extends Module<Client> {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const functionFactory = (
			ctor: FunctionConstructor
		): FunctionConstructor => {
			return proxyModule.wrapFunction(
				ctor,
				(target, that, args, newTarget) => {
					if (args.length !== 0) {
						let [code] = args.splice(-1, 1);
						code = String(code);
						code = modifyJS(
							code,
							this.client.url,
							this.client.config,
							'generic'
						);
						args.push(code);
					}

					return newTarget
						? Reflect.construct(target, args, newTarget)
						: Reflect.apply(target, that, args);
				},
				true
			);
		};

		const proxyAsyncFunction = functionFactory(AsyncFunction);
		const proxyFunction = functionFactory(Function);

		Reflect.defineProperty(Function.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: proxyFunction,
		});

		Reflect.defineProperty(AsyncFunction.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: proxyAsyncFunction,
		});

		Function.prototype.constructor = proxyFunction;
		AsyncFunction.prototype.constructor = proxyAsyncFunction;

		global.Function = proxyFunction;
	}
}
