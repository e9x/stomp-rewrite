import { Client } from './Client';
import FetchModule from './modules/Fetch';
import ProxyModule from './modules/Proxy';

export default function baseModules(client: Client) {
	client.addModule(ProxyModule);
	client.addModule(FetchModule);
}
