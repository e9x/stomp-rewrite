import { createClientFactory } from '../Client';
import baseModules from '../modules';
import WorkerClient from './Client';
import XMLHttpRequestModule from './modules/XMLHttpRequest';

export default createClientFactory(WorkerClient, (client) => {
	baseModules(client);
	client.addModule(XMLHttpRequestModule);
});
