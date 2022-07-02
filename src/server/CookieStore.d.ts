/* eslint-disable no-var */

declare type CookieSameSite = 'none' | 'lax' | 'strict';

interface Cookie {
	domain: string;
	expires: number;
	name: string;
	path: string;
	secure: boolean;
	sameSite: CookieSameSite;
	value: string;
}

interface CookieChangeEvent extends Event {
	changed: Cookie[];
	deleted: Cookie[];
}

declare interface CookieStoreEventMap {
	change: CookieChangeEvent;
}

declare interface CookieStore extends EventTarget {
	onchange: ((this: CookieStore, ev: CookieChangeEvent) => any) | null;
	addEventListener<K extends keyof CookieStoreEventMap>(
		type: K,
		listener: (this: CookieStore, ev: CookieStoreEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions
	): void;
	removeEventListener<K extends keyof CookieStoreEventMap>(
		type: K,
		listener: (this: CookieStore, ev: CookieStoreEventMap[K]) => any,
		options?: boolean | EventListenerOptions
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions
	): void;

	/**
	 * Get a cookie.
	 */
	get(name: string): Promise<Cookie>;
	get(options: { name?: string; url?: string }): Promise<Cookie>;
	/**
	 * Set a cookie.
	 */
	set(name: string, value: string): Promise<void>;
	set(
		options: Partial<Cookie> & { name: string; value: string }
	): Promise<void>;
	/**
	 * Get multiple cookies.
	 */
	getAll(name: string): Promise<Cookie[]>;
	getAll(options: { name?: string; url?: string }): Promise<Cookie[]>;
	/**
	 * Remove a cookie.
	 */
	delete(name: string): Promise<void>;
	delete(options: { name: string; url?: string; path?: string }): Promise<void>;
}

declare var cookieStore: CookieStore;
