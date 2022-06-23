import global from '../../global.js';
import { modifyJS } from '../../rewriteJS.js';
import Module from '../Module.js';
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

export default class FunctionModule extends Module {
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;
		const clientURL = this.client.url;

		function FunctionFactory(ctor: FunctionConstructor): FunctionConstructor {
			return <FunctionConstructor>function (...args: (any | string)[]) {
				if (args.length !== 0) {
					let [code] = args.splice(-1, 1);
					code = String(code);
					code = modifyJS(code, clientURL, false);
					args.push(code);
				}

				return new ctor(...args);
			};
		}

		const proxyAsyncFunction = FunctionFactory(AsyncFunction);
		const proxyFunction = FunctionFactory(Function);

		proxyModule.mirrorAttributes(Function, proxyFunction);
		proxyModule.mirrorAttributes(Function, proxyFunction);

		// .prototype is writable...
		// @ts-ignore
		proxyFunction.prototype = Function.prototype;
		// @ts-ignore
		proxyAsyncFunction.prototype = AsyncFunction.prototype;

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
			value: AsyncFunction,
		});

		Function.prototype.constructor = proxyFunction;
		AsyncFunction.prototype.constructor = proxyAsyncFunction;

		global.Function = proxyFunction;
	}
}
