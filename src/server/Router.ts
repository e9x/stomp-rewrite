import createHttpError from 'http-errors';

export function json(status: number, data: unknown): Response {
	return new Response(JSON.stringify(data, null, '\t'), {
		status,
		headers: {
			'content-type': 'application/json',
		},
	});
}

export default class Router {
	private directory: string;
	routes: Map<
		RegExp,
		(request: Request, url: string) => Promise<Response> | Response
	>;
	constructor(directory: string) {
		this.directory = directory;
		this.routes = new Map();
	}
	private resolveURL(fullURL: string): string {
		return '/' + new URL(fullURL).pathname.slice(this.directory.length);
	}
	willRoute(fullURL: string): boolean {
		const url = this.resolveURL(fullURL);

		for (const regex of this.routes.keys()) {
			if (regex.test(url)) {
				return true;
			}
		}

		return false;
	}
	async tryRoute(request: Request): Promise<Response> {
		const url = this.resolveURL(request.url);

		for (const [regex, value] of this.routes) {
			if (regex.test(url)) {
				return value(request, url);
			}
		}

		throw new createHttpError.NotFound(
			`${request.url} shouldn't have been routed`
		);
	}
	async route(request: Request): Promise<Response> {
		try {
			return await this.tryRoute(request);
		} catch (error) {
			console.error(`At ${request.method} ${request.url}`);
			console.error(error);

			let httpError;
			let id;

			if (createHttpError.isHttpError(error)) {
				httpError = error;
			} else {
				if (error instanceof Error) {
					httpError = new createHttpError.InternalServerError(error.toString());
					console.error(error.stack);
					id = error.name;
				} else {
					httpError = new createHttpError.InternalServerError(String(error));
					id = 'UNKNOWN';
				}
			}

			if (request.destination === 'document') {
				return new Response(
					`<!DOCTYPE HTML>
<html>
<head>
<meta charset='utf-8' />
<title>Error</title>
</head>
<body>
<h1>An error occurred. (${httpError.status})</h1>
<hr />
<p>Code: <span id='errname'></span></p>
<p>ID: <span id='errid'></span></p>
<p>Message: <span id='errmessage'></span></p>
<p>Stack trace:</p>
<pre id='errstack'></pre>
<script>
const name = ${JSON.stringify(httpError.name)};
const stack = ${JSON.stringify(httpError.stack)};
const message = ${JSON.stringify(httpError.message)};
const id = ${JSON.stringify(id)};

errname.textContent = name;
errmessage.textContent = message;
errstack.textContent = stack;
errid.textContent = id;

const error = new Error(message);
error.name = name;
error.stack = stack;
console.error(error);
</script>
</body>
</html>`,
					{
						status: httpError.status,
						headers: {
							'content-type': 'text/html',
						},
					}
				);
			} else {
				return json(httpError.status, {
					message: httpError.message,
					status: httpError.status,
				});
			}
		}
	}
}

export function jsonAPI(callback: (...args: any[]) => any) {
	return async (request: Request): Promise<Response> => {
		try {
			const result = await callback(...(await request.json()));
			return json(200, result === undefined ? null : result);
		} catch (error) {
			return json(500, String(error));
		}
	};
}
