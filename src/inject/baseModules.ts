import { Client } from './Client.js';
import FetchModule from './modules/Fetch.js';
import ProxyModule from './modules/Proxy.js';

export default function baseModules(client: Client) {
	client.addModule(ProxyModule);
	client.addModule(FetchModule);
}
