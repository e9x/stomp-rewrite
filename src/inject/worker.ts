import { createClientFactory } from './Client';
import WorkerClient from './WorkerClient';
import baseModules from './baseModules';

export default createClientFactory(WorkerClient, client => {
	baseModules(client);
});
