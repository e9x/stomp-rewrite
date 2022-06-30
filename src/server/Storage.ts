import Router, { jsonAPI } from './Router';
import { deleteDB, IDBPDatabase, openDB } from 'idb';

interface ItemEntry {
	item: string;
	value: string;
	origin: string;
	key: string;
}

export default class Storage {
	db: IDBPDatabase;
	constructor(db: IDBPDatabase) {
		this.db = db;
	}
	private resolveKey(origin: string, item: string) {
		return `${origin}/${item}`;
	}
	async getItem(origin: string, item: string): Promise<string | undefined> {
		const data: ItemEntry | undefined = await this.db.getFromIndex(
			'storage',
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
		console.log('set', item, value);
		await this.db.put('storage', {
			item,
			value,
			origin,
			key: this.resolveKey(origin, item),
		} as ItemEntry);
	}
	async removeItem(origin: string, item: string): Promise<void> {
		await this.db.delete('storage', this.resolveKey(origin, item));
	}
	async hasItem(origin: string, item: string): Promise<boolean> {
		return (await this.getItem(origin, item)) !== undefined;
	}
	async getKeys(origin: string): Promise<string[]> {
		return (
			await this.db.getAllFromIndex(
				'storage',
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

const commonCallbacks = {
	upgrade(db: IDBPDatabase) {
		const storage = db.createObjectStore('storage', {
			keyPath: 'key',
		});

		storage.createIndex('origin', 'origin');
		storage.createIndex('key', 'key');
	},
};

export async function registerStorage(router: Router) {
	deleteDB('sessionStorage');
	const sessionStorage = new Storage(
		await openDB('sessionStorage', 1, commonCallbacks)
	);

	const localStorage = new Storage(
		await openDB('localStorage', 1, commonCallbacks)
	);

	const register: [name: string, host: Storage][] = [
		['sessionStorage', sessionStorage],
		['localStorage', localStorage],
	];

	for (const [name, host] of register) {
		for (const api of [
			'getItem',
			'setItem',
			'removeItem',
			'hasItem',
			'getKeys',
			'clear',
		]) {
			console.log(`^\\/${name}\\/${api}$`);
			router.routes.set(
				new RegExp(`^\\/${name}\\/${api}$`),
				jsonAPI(host[api as keyof Omit<Storage, 'db'>].bind(host))
			);
		}
	}
}
