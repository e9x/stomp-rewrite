import { Client } from './Client.js';

export default class Module {
	protected client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	apply?(): void;
}
