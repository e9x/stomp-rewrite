import Router, { jsonAPI } from './Router';
import { IDBPDatabase, openDB } from 'idb';

interface ItemEntry {
	item: string;
	value: string;
	origin: string;
	key: string;
}

export default class Storage {
	private db: IDBPDatabase;
	private store: string;
	constructor(db: IDBPDatabase, store: string) {
		this.db = db;
		this.store = store;
	}
	private resolveKey(origin: string, item: string) {
		return `${origin}/${item}`;
	}
	async getItem(origin: string, item: string): Promise<string | undefined> {
		const data: ItemEntry | undefined = await this.db.getFromIndex(
			this.store,
			'key',
			this.resolveKey(origin, item)
		);

		if (data) {
			return data.value;
		} else {
			return undefined;
		}
	}
	async setItem(origin: string, item: string, value: string): Promise<void> {
		await this.db.put(this.store, {
			item,
			value,
			origin,
			key: this.resolveKey(origin, item),
		} as ItemEntry);
	}
	async removeItem(origin: string, item: string): Promise<void> {
		await this.db.delete(this.store, this.resolveKey(origin, item));
	}
	async getKeys(origin: string): Promise<string[]> {
		return (
			await this.db.getAllFromIndex(
				this.store,
				'origin',
				IDBKeyRange.only(origin)
			)
		).map(({ item }: ItemEntry) => item);
	}
	async clear(origin: string): Promise<void> {
		for (const key of await this.getKeys(origin)) {
			this.removeItem(origin, key);
		}
	}
}

export async function registerStorage(router: Router) {
	const db = await openDB('stompStorage', 1, {
		upgrade: (db: IDBPDatabase) => {
			for (const name of ['localStorage', 'sessionStorage']) {
				const storage = db.createObjectStore(name, {
					keyPath: 'key',
				});

				storage.createIndex('origin', 'origin');
				storage.createIndex('key', 'key');
			}
		},
	});

	db.clear('sessionStorage');

	const localStorage = new Storage(db, 'localStorage');
	const sessionStorage = new Storage(db, 'sessionStorage');

	const register: [name: string, host: Storage][] = [
		['sessionStorage', sessionStorage],
		['localStorage', localStorage],
	];

	for (const [name, host] of register) {
		for (const api of [
			'getItem',
			'setItem',
			'removeItem',
			'getKeys',
			'clear',
		]) {
			router.routes.set(
				new RegExp(`^\\/${name}\\/${api}$`),
				jsonAPI(host[api as keyof Storage].bind(host))
			);
		}
	}
}
