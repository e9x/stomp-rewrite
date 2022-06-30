interface SerializableRequestInit
	extends Omit<Omit<Omit<RequestInit, 'signal'>, 'headers'>, 'body'> {
	headers?: { [key: string]: string | string[] };
}

interface ProcessData {
	url: string;
	init: SerializableRequestInit;
	body?: string;
}

type ProcessResult =
	| {
			error?: { message: string };
	  }
	| {
			textArrayBuffer: string;
			init: ResponseInit;
			url: string;
	  };
