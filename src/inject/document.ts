import { ParsedConfig } from '../config';
import ElementIterator from '../elementUtil';
import Client, { createClientFactory } from './Client';
import baseModules from './baseModules';
import DOMModule from './documentModules/DOM';
import { DOMHooksModule } from './documentModules/DOMHooks';
import HistoryModule from './documentModules/History';
import IFrameModule from './documentModules/IFrame';
import LocationModule from './documentModules/Location';
import NavigatorModule from './documentModules/Navigator';
import { decode } from 'entities';

const STACK_ITERATE = Symbol();
const STACK_FINALIZE = Symbol();

type stackIterateData = [child: HTMLElement, target: HTMLElement];
type stackFinalizeData = [parent: HTMLElement, node: HTMLElement];

class DocumentClient extends Client {
	constructor(init: ParsedConfig) {
		super(init);
		baseModules(this);
		this.addModule(HistoryModule);
		this.addModule(NavigatorModule);
		this.addModule(LocationModule);
		this.addModule(DOMHooksModule);
		this.addModule(DOMModule);
		this.addModule(IFrameModule);
	}

	loadHTML(script: string) {
		const replaceAfterParse = new Map<HTMLElement, HTMLElement>();
		const dom = new DOMParser().parseFromString(decode(script), 'text/html');

		this.apply();

		/**
		 *
		 * @param node Node to clone
		 * @param target Destination for the cloned node
		 */
		function clone(node: HTMLElement, target: HTMLElement) {
			const tempTarget = document.createElement('div');

			const stack: [symbol, ...(stackIterateData | stackFinalizeData)][] = [
				[STACK_ITERATE, node, tempTarget],
			];

			while (true) {
				const array = stack.pop();

				if (!array) break;

				const [instruction, ...data] = array;

				switch (instruction) {
					case STACK_ITERATE:
						{
							const d = data as stackIterateData;

							if (d[0] instanceof Text) {
								d[1].append(d[0]);
								continue;
							}

							const target = document.createElement(d[0].nodeName);

							for (const attribute of d[0].getAttributeNames()) {
								target.setAttribute(attribute, d[0].getAttribute(attribute)!);
							}

							const max = d[0].childNodes.length;
							for (let i = 0; i < max; i++) {
								// append in reverse order
								const child = d[0].childNodes[max - i - 1] as HTMLElement;
								stack.push([STACK_ITERATE, child, target]);
							}

							if (
								target instanceof HTMLScriptElement &&
								target.hasAttribute('defer')
							) {
								const placeholder = document.createElement('div');
								replaceAfterParse.set(placeholder, target);
								stack.push([STACK_FINALIZE, d[1], placeholder]);
							} else {
								stack.push([STACK_FINALIZE, d[1], target]);
							}
						}
						break;
					case STACK_FINALIZE:
						{
							const d = data as stackFinalizeData;
							d[0].append(d[1]);
						}
						break;
				}

				// if (!(ctx.node instanceof HTMLElement)) continue;

				// const element = document.createElement(ctx.node.nodeName);
			}

			for (const child of tempTarget.childNodes) {
				target.append(child);
			}
		}

		document.body.remove();
		document.head.remove();

		document.documentElement.remove();
		clone(dom.documentElement, <HTMLElement>(<unknown>document));

		for (const [element, replaceWith] of replaceAfterParse) {
			element.replaceWith(replaceWith);
		}
	}
}

export default createClientFactory(DocumentClient);
