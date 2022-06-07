import StompURL from './StompURL';
import { parse } from 'meriyah';

export default class JSRewriter {
	modify(script: string, url: StompURL, module: boolean) {
		const tree = parse(script, {
			module,
			next: true,
			specDeviation: true,
			loc: true,
		});

		console.log(tree.loc);

		return script;
	}
	restore(script: string, url: StompURL) {}
}
