import Client from './Client';
import AccessModule from './baseModules/Access';
import FetchModule from './baseModules/Fetch';
import FunctionModule from './baseModules/Function';
import ProxyModule from './baseModules/Proxy';
import XMLHttpRequestModule from './baseModules/XMLHttpRequest';

export default function baseModules(client: Client) {
	client.addModule(ProxyModule);
	client.addModule(FetchModule);
	client.addModule(AccessModule);
	client.addModule(FunctionModule);
	client.addModule(XMLHttpRequestModule);
}
