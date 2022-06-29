import { createClientFactory } from './Client';
import DocumentClient from './DocumentClient';
import baseModules from './baseModules';
import AudioModule from './documentModules/Audio';
import DOMModule from './documentModules/DOM';
import { DOMHooksModule } from './documentModules/DOMHooks';
import HistoryModule from './documentModules/History';
import IFrameModule from './documentModules/IFrame';
import LocationModule from './documentModules/Location';
import NavigatorModule from './documentModules/Navigator';
import SyncModule from './documentModules/Sync';

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
