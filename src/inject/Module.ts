export default class Module<C> {
	protected client: C;
	constructor(client: C) {
		this.client = client;
	}
	/**
	 * Make changes to global objects/prototypes
	 */
	apply?(): void;
}
