import { createClientFactory } from '../Client';
import baseModules from '../modules';
import WorkerClient from './Client';

export default createClientFactory(WorkerClient, client => {
	baseModules(client);
});
