import { ParsedConfig } from '../config';
import Router from './Router';
import { deleteDB, IDBPDatabase, openDB } from 'idb';

export default class Storage {
	db: IDBPDatabase;
	constructor(db: IDBPDatabase) {
		this.db = db;
	}
	private resolveKey(origin: string, item: string) {
		return `${item}/${origin}`;
	}
	async getItem(origin: string, item: string): Promise<string | undefined> {
		const data = await this.db.getFromIndex(
			'storage',
			'key',
			this.resolveKey(origin, item)
		);

		if (typeof data === 'string') {
			return data;
		} else if (typeof data === 'undefined') {
			return undefined;
		}
	}
	async setItem(origin: string, item: string, value: string): Promise<void> {
		await this.db.put('storage', {
			item,
			value,
			origin,
			key: this.resolveKey(origin, item),
		});
	}
	async removeItem(origin: string, item: string): Promise<void> {
		await this.db.delete('storage', this.resolveKey(origin, item));
	}
	async hasItem(origin: string, item: string): Promise<boolean> {
		return (await this.getItem(origin, item)) !== undefined;
	}
	async getKeys(origin: string): Promise<string[]> {
		return (await this.db.getAll('storage', IDBKeyRange.only(origin))).map(
			({ name }) => name
		);
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

	router.routes.set(/\/localStorage\/clear/, request => {
		// localStorage.clear

		return new Response();
	});
}
