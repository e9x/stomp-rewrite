declare interface AbortController {
	/** Returns the AbortSignal object associated with this object. */
	readonly signal: AbortSignal;
	/** Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted. */
	abort(reason?: any): void;
}
