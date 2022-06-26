interface ProcessData {
	url: string;
	init: RequestInit;
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
