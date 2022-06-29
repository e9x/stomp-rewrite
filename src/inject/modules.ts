import Client from './Client';
import AccessModule from './modules/Access';
import FetchModule from './modules/Fetch';
import FunctionModule from './modules/Function';
import IndexedDBModule from './modules/IndexedDB';
import ProxyModule from './modules/Proxy';
import WorkerModule from './modules/Worker';
import XMLHttpRequestModule from './modules/XMLHttpRequest';

export default function baseModules(client: Client) {
	client.addModule(ProxyModule);
	client.addModule(FetchModule);
	client.addModule(AccessModule);
	client.addModule(FunctionModule);
	client.addModule(WorkerModule);
	client.addModule(XMLHttpRequestModule);
	client.addModule(IndexedDBModule);
}
