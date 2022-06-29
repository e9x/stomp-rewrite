import { createClientFactory } from '../Client';
import baseModules from '../modules';
import DocumentClient from './Client';
import AudioModule from './modules/Audio';
import DOMModule from './modules/DOM';
import { DOMHooksModule } from './modules/DOMHooks';
import HistoryModule from './modules/History';
import IFrameModule from './modules/IFrame';
import LocationModule from './modules/Location';
import NavigatorModule from './modules/Navigator';
import SyncModule from './modules/Sync';

export default createClientFactory(DocumentClient, client => {
	baseModules(client);
	client.addModule(HistoryModule);
	client.addModule(NavigatorModule);
	client.addModule(LocationModule);
	client.addModule(DOMHooksModule);
	client.addModule(DOMModule);
	client.addModule(IFrameModule);
	client.addModule(SyncModule);
	client.addModule(AudioModule);
});
