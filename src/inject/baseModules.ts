import { Client } from './Client';
import AccessModule from './modules/Access';
import FetchModule from './modules/Fetch';
import ProxyModule from './modules/Proxy';

export default function baseModules(client: Client) {
	client.addModule(ProxyModule);
	client.addModule(FetchModule);
	client.addModule(AccessModule);
}
