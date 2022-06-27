import { encodeCookie } from '../encodeCookie';
import Server from './Server';
import { maxRedirects, statusRedirect } from '@tomphttp/bare-client';

async function process(
	server: Server,
	data: ProcessData
): Promise<ProcessResult> {
	if (data.body !== undefined) {
		data.init.body = data.body;
	}

	let redirects = maxRedirects;

	try {
		let url: string = data.url;

		while (redirects--) {
			const request = new Request(url, data.init);

			if (!server.willRoute(url)) {
				throw new Error('Not found');
			}

			const response = await server.route(request);

			if (
				statusRedirect.includes(response.status) &&
				response.headers.has('location')
			) {
				url = new URL(response.headers.get('location')!, url).toString();
				continue;
			}

			return {
				textArrayBuffer: new TextDecoder().decode(await response.arrayBuffer()),
				init: {
					status: response.status,
					statusText: response.statusText,
					headers: Object.fromEntries(response.headers.entries()),
				},
				url: url.toString(),
			};
		}

		throw new Error('too many redirects');
	} catch (error) {
		return {
			error: {
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}
}

export async function gxhr(
	request: Request,
	server: Server
): Promise<Response> {
	return new Response(
		JSON.stringify(await process(server, await request.json()))
	);
}

export async function xhr(request: Request, server: Server): Promise<Response> {
	const { id, data } = await request.json();

	console.log('got xhr req', id, data);

	const response = await process(server, data);

	console.log('processed');

	const long = encodeCookie(JSON.stringify(response));
	let chunks = 0;
	const split = 4000;

	for (let i = 0; i < long.length; i += split) {
		const part = long.slice(i, i + 4000);

		const chunk = chunks++;

		await cookieStore.set({
			name: id + chunk,
			value: part,
			maxAge: 10,
			path: '/',
		});
	}

	encodeCookie(JSON.stringify(response));

	await cookieStore.set({
		name: id,
		value: chunks.toString(),
		maxAge: 10,
		path: '/',
	});

	return new Response();
}