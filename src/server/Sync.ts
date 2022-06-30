import { encodeCookie } from '../encodeCookie';
import Router from './Router';
import { maxRedirects, statusRedirect } from '@tomphttp/bare-client';

async function process(
	router: Router,
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

			if (!router.willRoute(url)) {
				throw new Error('Not found');
			}

			const response = await router.route(request);

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

export function registerXhr(router: Router) {
	router.routes.set(/\/gxhr/, async request => {
		return new Response(
			JSON.stringify(await process(router, await request.json()))
		);
	});

	router.routes.set(/\/xhr/, async request => {
		const { id, data } = await request.json();

		console.log('got xhr req', id, data);

		const response = await process(router, data);

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
	});
}
