import { Client } from './Client';

export default class Module {
	protected client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	apply?(): void;
}
