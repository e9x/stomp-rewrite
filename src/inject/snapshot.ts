// snapshots of classes that are replaced/modified during module apply time
// exports automatically provided to modules in bundle

export const Reflect: typeof globalThis.Reflect = {
	apply: global.Reflect.apply.bind(global.Reflect),
	construct: global.Reflect.construct.bind(global.Reflect),
	defineProperty: global.Reflect.defineProperty.bind(global.Reflect),
	deleteProperty: global.Reflect.deleteProperty.bind(global.Reflect),
	get: global.Reflect.get.bind(global.Reflect),
	has: global.Reflect.has.bind(global.Reflect),
	getOwnPropertyDescriptor: global.Reflect.getOwnPropertyDescriptor.bind(
		global.Reflect
	),
	getPrototypeOf: global.Reflect.getPrototypeOf.bind(global.Reflect),
	isExtensible: global.Reflect.isExtensible.bind(global.Reflect),
	ownKeys: global.Reflect.ownKeys.bind(global.Reflect),
	preventExtensions: global.Reflect.preventExtensions.bind(global.Reflect),
	set: global.Reflect.set.bind(global.Reflect),
	setPrototypeOf: global.Reflect.setPrototypeOf.bind(global.Reflect),
};

export const fetch = global.fetch;

export const XMLHttpRequest = global.XMLHttpRequest;

export const XMLHttpRequestEventTarget = global.XMLHttpRequestEventTarget;

export const EventSource = global.EventSource;

export const WebSocket = global.WebSocket;

export const Function = global.Function;

export const AsyncFunction: FunctionConstructor = <FunctionConstructor>(
	(async () => undefined).constructor
);

export const navigator: Navigator = {} as any;

{
	const descriptors = Object.getOwnPropertyDescriptors(Navigator.prototype);

	for (const name in descriptors) {
		const { get, set, value, writable } = descriptors[name];
		const define: PropertyDescriptor = {};

		if (get) define.get = get.bind(global.navigator);

		if (set) define.set = set.bind(global.navigator);

		if (value)
			define.value =
				typeof value === 'function' ? value.bind(global.navigator) : value;

		if (typeof writable === 'boolean') define.writable = writable;

		Reflect.defineProperty(navigator, name, define);
	}
}
