import { ParsedConfig } from '../../config';
import Client from '../Client';

export default class WorkerClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		this.isWorker = true;
	}
}
