import Router, { jsonAPI } from './Router';
import { IDBPDatabase, openDB } from 'idb';
import parseSetCookie, { Cookie as ParserCookie } from 'set-cookie-parser';

const sameSites = ['lax', 'strict', 'none'];

type SameSite = 'lax' | 'strict' | 'none';

interface Cookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	httpOnly: boolean;
	secure: boolean;
	maxAge?: number;
	expires?: Date;
	sameSite: SameSite;
}

type SessionCookie = Omit<Omit<Cookie, 'maxAge'>, 'expires'>;

const normalizeCookie = (object: ParserCookie, url: URL): Cookie => ({
	name: object.name,
	value: object.value,
	domain: object.domain || url.hostname,
	path: object.path || '/',
	httpOnly: !!object.httpOnly,
	sameSite: sameSites.includes(object.sameSite?.toLowerCase() || '')
		? (object.sameSite!.toLowerCase() as SameSite)
		: 'none',
	secure: !!object.secure,
	maxAge: typeof object.maxAge === 'number' ? object.maxAge : undefined,
	expires: object.expires,
});

interface FloatingCookie extends SessionCookie {
	session: boolean;
	expires?: Date;
}

const flattenCookie = (cookie: Readonly<Cookie>): FloatingCookie => {
	const result: Cookie & Partial<FloatingCookie> = { ...cookie };

	if (cookie.maxAge) {
		result.expires = new Date(Date.now() + cookie.maxAge);
		delete result.maxAge;
	}

	result.session = !result.expires;

	if (result.session) {
		// : may be undefined
		delete result.maxAge;
		delete result.expires;
	}

	// result.expires: Date|void
	return <FloatingCookie>result;
};

export class BrowserCookieArray extends Array<FloatingCookie> {
	toString() {
		const result: string[] = [];

		for (const cookie of this) {
			result.push(`${cookie.name}=${cookie.value}`);
		}

		return result.join('; ');
	}
}

function cookieExpired(cookie: FloatingCookie): boolean {
	if (cookie.session) {
		return false;
	}

	return Date.now() < cookie.expires!.getTime();
}

function testCookieOwnership(cookie: FloatingCookie, url: URL): boolean {
	return (
		`.${url.hostname}`.endsWith(cookie.domain) &&
		url.pathname.startsWith(cookie.path)
	);
}

export default class Cookies {
	private db: IDBPDatabase;
	constructor(db: IDBPDatabase) {
		this.db = db;
	}
	async get(url: string | URL): Promise<BrowserCookieArray> {
		url = new URL(url);

		const entries: FloatingCookie[] = [
			...(await this.db.getAll('sessionCookies')).map(
				(cookie: SessionCookie): FloatingCookie => ({
					...cookie,
					session: true,
				})
			),
			...(await this.db.getAll('cookies')).map(
				(cookie: SessionCookie): FloatingCookie => ({
					...cookie,
					session: false,
				})
			),
		];

		const result = new BrowserCookieArray();

		for (const cookie of entries) {
			if (cookieExpired(cookie)) {
				this.db.delete(
					cookie.session ? 'sessionCookies' : 'cookies',
					cookie.name
				);
			} else if (testCookieOwnership(cookie, url)) {
				result.push(cookie);
			}
		}

		return result;
	}
	async set(cookies: string | string[], url: URL | string): Promise<void> {
		url = new URL(url);

		if (!Array.isArray(cookies)) {
			cookies = [cookies];
		}

		for (const cookie of cookies)
			for (const parsedCookie of parseSetCookie(cookie, {
				decodeValues: false,
				silent: true,
			})) {
				const flat = flattenCookie(normalizeCookie(parsedCookie, url));
				const id = [flat.domain, flat.path, flat.name]
					.map((value) => JSON.stringify(value))
					.join('@@');
				this.db.put(flat.session ? 'sessionCookies' : 'cookies', {
					...flat,
					id,
				});
			}
	}
}

export async function registerCookies(router: Router): Promise<Cookies> {
	const db = await openDB('stompCookies', 1, {
		upgrade: (db: IDBPDatabase) => {
			for (const name of ['cookies', 'sessionCookies']) {
				db.createObjectStore(name, {
					keyPath: 'id',
				});
				// maybe there will be more indexes...
				// cookies have no viable keys, domain and path aren't absolute
			}
		},
	});

	db.clear('sessionCookies');

	const cookies = new Cookies(db);

	for (const api of ['get', 'set']) {
		router.routes.set(
			new RegExp(`^\\/cookies\\/${api}$`),
			jsonAPI(cookies[api as keyof Cookies].bind(cookies))
		);
	}

	return cookies;
}
