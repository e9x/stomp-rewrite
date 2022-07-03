const HOST = /^(\S*?\.\S*|^localhost(:\d+)?)(\/.*?)?$/;
const HTTP = /^https?:\/\//;

export default class SearchBuilder {
	template: string;
	constructor(template: string) {
		this.template = template;
	}
	query(input: string) {
		if (HTTP.test(input)) {
			return input;
		} else if (HOST.test(input)) {
			return `http://${input}`;
		} else {
			return this.template.replace('%s', encodeURIComponent(input));
		}
	}
}
