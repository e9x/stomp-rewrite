export function parseHTML(script: string) {
	return new DOMParser().parseFromString(script, 'text/html');
}

export function parseHTMLFragment(script: string): DocumentFragment {
	const parsed = new DOMParser().parseFromString(
		`<fragment>${script}</fragment>`,
		'text/html'
	);
	const simulatedFragment = parsed.body.children[0];
	const fragment = document.createDocumentFragment();

	for (const child of simulatedFragment.childNodes) {
		fragment.append(child);
	}

	return fragment;
}

const STACK_ITERATE = Symbol();
const STACK_FINALIZE = Symbol();

type stackIterateData = [child: Node, target: ParentNode];
type stackFinalizeData = [parent: ParentNode, node: Node];

type AfterAppendCallback = () => void;

function afterAppendCallback(this: Map<HTMLElement, HTMLElement>) {
	// when working with the DOM, scripts may be deferred and only ran once the document has been parsed
	for (const [element, replaceWith] of this) {
		element.replaceWith(replaceWith);
	}
}

/**
 * Clones or re-creates the node using the hooked DOM apis
 * @param node Node to clone
 * @param target Destination for the cloned node
 */
export default function cloneRawNode(
	fragment: ParentNode
): [cloned: DocumentFragment, appendCallback: AfterAppendCallback] {
	const replaceAfterParse = new Map<HTMLElement, HTMLElement>();

	const tempTarget = document.createDocumentFragment();

	const stack: [symbol, ...(stackIterateData | stackFinalizeData)][] = [];

	const max = fragment.childNodes.length;
	for (let i = 0; i < max; i++) {
		const child = fragment.childNodes[max - i - 1];
		stack.push([STACK_ITERATE, child, tempTarget]);
	}

	while (true) {
		const array = stack.pop();

		if (!array) break;

		const [instruction, ...data] = array;

		switch (instruction) {
			case STACK_ITERATE:
				{
					const d = data as stackIterateData;

					if (d[0] instanceof Text || d[0] instanceof Comment) {
						d[1].append(d[0]);
						continue;
					}

					const target = document.createElement(d[0].nodeName);

					if (d[0] instanceof Element) {
						for (const attribute of d[0].getAttributeNames()) {
							target.setAttribute(attribute, d[0].getAttribute(attribute)!);
						}
					}

					const max = d[0].childNodes.length;
					for (let i = 0; i < max; i++) {
						// append in reverse order
						const child = d[0].childNodes[max - i - 1];
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
	}

	return [tempTarget, afterAppendCallback.bind(replaceAfterParse)];
}
