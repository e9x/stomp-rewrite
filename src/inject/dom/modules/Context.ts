import StompURL, { isUrlLike } from '../../../StompURL';
import { routeHTML } from '../../../rewriteHTML';
import { CLIENT_KEY, GLOBAL_NAME } from '../../../rewriteJS';
import Module from '../../Module';
import ProxyModule, {
	applyDescriptors,
	catchRequiredArguments,
	usePrototype,
} from '../../modules/Proxy';
import { nativeFunction } from '../../nativeUtil';
import DocumentClient, { onDocumentOpen } from '../Client';
import { urlLike } from '@tomphttp/bare-client';
import domainNameParser from 'effective-domain-name-parser';

export function sameHost(first: string, second: string): boolean {
	return (
		domainNameParser.parse(first).sld === domainNameParser.parse(second).sld
	);
}

function removeBlob(protocol: string): string {
	return protocol.startsWith('blob:') ? protocol.slice(5) : protocol;
}

export function sameOrigin(first: string, second: string): boolean {
	const firstURL = new URL(first);
	const secondURL = new URL(second);
	return (
		removeBlob(firstURL.protocol) === removeBlob(secondURL.protocol) &&
		firstURL.port === secondURL.port &&
		sameHost(firstURL.host, secondURL.host)
	);
}

function findTop(): Context {
	const stack: Context[] = [global];

	while (true) {
		const context = stack.pop();

		if (!context) {
			return global;
		}

		try {
			if (CLIENT_KEY in context) {
				// only set if unique
				const parent = (context[CLIENT_KEY] as DocumentClient).parent;

				if (parent !== undefined) {
					stack.unshift(parent);
				}
			}
		} catch (error) {
			//
		}
	}
}

type PostMessageArgs = [
	message: any,
	targetOrigin: string,
	transfer?: Transferable[]
];

type PostMessageArgs2 = [message: any, options?: WindowPostMessageOptions];

function isPostMessageArgs2(
	args: PostMessageArgs | PostMessageArgs2
): args is PostMessageArgs2 {
	return args.length === 2;
}

type Context = typeof globalThis;
type RestrictedContext = typeof globalThis;

const nativeMessageEvent: MessageEvent = Object.create({});

applyDescriptors(nativeMessageEvent, MessageEvent.prototype);

interface MessageData {
	[GLOBAL_NAME]: 'stompMessage';
	data: any;
	origin: string;
}

function isMessageData(data: any): data is MessageData {
	return (
		typeof data === 'object' &&
		data !== null &&
		data[GLOBAL_NAME] === 'stompMessage'
	);
}

interface ParsedPostMessageArgs {
	data: any;
	transfer: Transferable[];
	targetOrigin: string;
}

export default class ContextModule extends Module<DocumentClient> {
	restricted: WeakMap<Context, RestrictedContext>;
	restrictedContexts: WeakMap<RestrictedContext, Context>;
	constructor(client: DocumentClient) {
		super(client);
		this.restricted = new WeakMap();
		this.restrictedContexts = new WeakMap();
	}
	restrictObject(interfaces: PropertyDescriptorMap) {
		const restricted = {};

		Reflect.setPrototypeOf(restricted, null);

		for (const unknown of [
			'then',
			Symbol.toStringTag,
			Symbol.hasInstance,
			Symbol.isConcatSpreadable,
		])
			Reflect.defineProperty(restricted, unknown, {
				value: undefined,
				writable: false,
				enumerable: false,
				configurable: false,
			});

		const accessError = () =>
			new DOMException(
				`Blocked a frame with "${this.client.url.url.origin}" from accessing a cross-origin frame.`
			);

		for (const key in interfaces) {
			const descriptor = interfaces[key];

			if (descriptor.value) {
				descriptor.writable = false;

				if (typeof descriptor.value === 'function')
					this.restrictFunction(descriptor.value);
			}

			if (descriptor.get)
				descriptor.get = this.restrictFunction(descriptor.get);

			if (descriptor.set)
				descriptor.set = this.restrictFunction(descriptor.set);

			Reflect.defineProperty(restricted, key, descriptor);
		}

		const proxy = new Proxy(restricted, {
			get: (target, prop, receiver) => {
				const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

				if (
					!descriptor ||
					(!('value' in descriptor) && typeof descriptor.get !== 'function')
				)
					throw accessError();

				return Reflect.get(target, prop, receiver);
			},
			set: (target, prop, value) => {
				const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

				if (!descriptor || typeof descriptor.set !== 'function') {
					throw accessError();
				}

				return Reflect.set(target, prop, value);
			},
			defineProperty: () => {
				throw accessError();
			},
			getOwnPropertyDescriptor: (target, prop) => {
				if (!(prop in target)) throw accessError();
				return Reflect.getOwnPropertyDescriptor(target, prop);
			},
			setPrototypeOf: () => {
				throw accessError();
			},
			has: (target, prop) => {
				if (!(prop in target)) throw accessError();
				return true;
			},
		});

		return proxy;
	}
	// eslint-disable-next-line @typescript-eslint/ban-types
	restrictFunction<T extends Function>(target: T): T {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const wrapped = proxyModule.wrapFunction(target, (target, that, args) => {
			return Reflect.apply(target, that, args);
		});

		proxyModule.functionStrings.set(wrapped, nativeFunction(target.name));

		return wrapped;
	}
	postMessage(
		args: PostMessageArgs | PostMessageArgs2
	): PostMessageArgs | PostMessageArgs2 {
		/*if (!this.RestrictedContexts.has(targetWindow)) {
			throw new TypeError('Illegal invocation');
		}*/

		// const window = this.RestrictedContexts.get(targetWindow)!;

		/*window.dispatchEvent(new MessageEvent('message', {
			data: message,
			origin: this.client.base.toOrigin(),
			source: global,
		}));*/

		/*if (targetOrigin !== undefined) {
			const { origin } = new URL(targetOrigin, this.client.url.toString());

			console.assert(
				window[CLIENT_KEY].url.url.toOrigin() === origin,
				'Bad origin',
				window[global_client].base.toOrigin(),
				origin
			);
		}*/

		const message: ParsedPostMessageArgs = isPostMessageArgs2(args)
			? {
					data: args[0],
					transfer: Array.isArray(args[1]?.transfer) ? args[1]!.transfer : [],
					targetOrigin: isUrlLike(args[1]) ? String(args[1]) : '*',
			  }
			: {
					data: args[0],
					transfer: Array.isArray(args[2]) ? args[2] : [],
					targetOrigin: isUrlLike(args[1]) ? String(args[1]) : '*',
			  };

		return <PostMessageArgs2>[
			<MessageData>{
				[GLOBAL_NAME]: 'stompMessage',
				data: message.data,
				origin: this.client.url.url.origin,
			},
			{
				targetOrigin: location.origin,
				transfer: message.transfer,
			},
		];
	}
	restrictContext(context: Context): RestrictedContext {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const restrictedLocation = this.restrictObject({
			replace: {
				value: (url: urlLike) => {
					context.location.replace(
						routeHTML(
							new StompURL(
								new URL(url, this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				},
			},
			href: {
				set: (value: urlLike) => {
					context.location.replace(
						routeHTML(
							new StompURL(
								new URL(value, this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				},
			},
		});

		return <any>this.restrictObject({
			0: {
				value: global,
			},
			top: {
				get: () => this.newRestricted(<Context>(<unknown>context.top!)),
			},
			parent: {
				get: () => this.newRestricted(<Context>(<unknown>context.parent!)),
			},
			opener: {
				get: () => this.newRestricted(<Context>(<unknown>context.opener!)),
			},
			self: {
				get: () => this.newRestricted(<Context>(<unknown>context.self!)),
			},
			frames: {
				get: () => this.newRestricted(<Context>(<unknown>context.frames!)),
			},
			window: {
				get: () => this.newRestricted(context.window!),
			},
			blur: {
				value: () => context.blur(),
			},
			focus: {
				value: () => context.focus(),
			},
			close: {
				value: () => context.close(),
			},
			closed: {
				get: () => context.closed,
			},
			length: {
				get: () => context.closed,
			},
			location: {
				get: () => restrictedLocation,
				set: (value: urlLike) => {
					context.location.replace(
						routeHTML(
							new StompURL(
								new URL(value, this.client.url.toString()),
								this.client.url
							),
							this.client.url,
							this.client.config
						)
					);
				},
			},
			postMessage: {
				value: proxyModule.wrapFunction(postMessage, (target, that, args) => {
					catchRequiredArguments(args.length, 1, 'Window', 'postMessage');
					return Reflect.apply(target, context, this.postMessage(<any>args));
				}),
			},
		});
	}
	newRestricted(context: Context): RestrictedContext {
		if (!(CLIENT_KEY in context)) {
			if (context === this.client.top) {
				return findTop();
			} else {
				return context;
			}
		}

		if (
			sameOrigin(
				this.client.url.toString(),
				((context as any)[CLIENT_KEY] as DocumentClient).url.toString()
			)
		) {
			console.log(
				this.client.url.toString(),
				'same origin as',
				((context as any)[CLIENT_KEY] as DocumentClient).url.toString()
			);
			return context;
		}

		if (!this.restricted.has(context)) {
			const restricted = this.restrictContext(context);

			this.restricted.set(context, restricted);
			this.restrictedContexts.set(restricted, context);
		}

		return this.restricted.get(context)!;
	}
	apply() {
		const proxyModule = this.client.getModule(ProxyModule)!;

		const parentDescriptor = Reflect.getOwnPropertyDescriptor(
			global,
			'parent'
		)!;

		Reflect.defineProperty(global, 'parent', {
			get: proxyModule.wrapFunction(
				parentDescriptor.get!,
				(target, that, args) => {
					const got = Reflect.apply(target, that, args);
					return this.newRestricted(got);
				}
			),
			set: parentDescriptor.set!,
			configurable: true,
			enumerable: true,
		});

		const messageData = new WeakMap<MessageEvent, MessageData>();

		Reflect.defineProperty(MessageEvent.prototype, 'origin', {
			configurable: true,
			enumerable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(MessageEvent.prototype, 'origin')!
					.get!,
				(target, that: MessageEvent, args) => {
					if (messageData.has(that)) {
						return messageData.get(that)!.origin;
					}

					return Reflect.apply(target, that, args);
				}
			),
		});

		Reflect.defineProperty(MessageEvent.prototype, 'data', {
			configurable: true,
			enumerable: true,
			get: proxyModule.wrapFunction(
				Reflect.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')!.get!,
				(target, that: MessageEvent, args) => {
					if (messageData.has(that)) {
						return messageData.get(that)!.data;
					}

					return Reflect.apply(target, that, args);
				}
			),
		});

		onDocumentOpen.push(() => {
			global.addEventListener('message', (event) => {
				/*console.error(
					this.client.url.url.toString(),
					event.data,
					isMessageData(event.data)
				);*/
				usePrototype(event, nativeMessageEvent, (event) => {
					if (isMessageData(event.data)) {
						messageData.set(event, event.data);
					} else {
						console.warn('Unknown message', event.data);
					}
				});
			});
		});

		global.postMessage = proxyModule.wrapFunction(
			global.postMessage,
			(target, that, args) => {
				catchRequiredArguments(args.length, 1, 'Window', 'postMessage');
				return Reflect.apply(target, global, this.postMessage(<any>args));
			}
		);
	}
}
