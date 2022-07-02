import { encodeCookie } from '../encodeCookie';
import Router from './Router';

const maxRedirects = 20;
const statusRedirect = [301, 302, 303, 307, 308];

async function process(
	router: Router,
	data: ProcessData
): Promise<ProcessResult> {
	const init: RequestInit = <RequestInit>{ ...data.init };

	if (data.body !== undefined) {
		init.body = data.body;
	}

	let redirects = maxRedirects;

	try {
		let url: string = data.url;

		while (redirects--) {
			const request = new Request(url, init);

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

const split = 4000;

export function registerXhr(router: Router) {
	router.routes.set(/\/gxhr/, async (request) => {
		return new Response(
			JSON.stringify(await process(router, await request.json()))
		);
	});

	router.routes.set(/\/xhr/, async (request) => {
		const { id, data } = await request.json();
		const expiration = new Date(Date.now() + 3e3);

		const response = await process(router, data);

		let long = encodeCookie(JSON.stringify(response));
		let mainCookieValue =
			(long.length < split - 2
				? '0'
				: Math.ceil(long.length / split).toString()) + ',';

		if (mainCookieValue.length < split) {
			const end = long.slice(0, split - mainCookieValue.length);
			long = long.slice(end.length);
			mainCookieValue += end;
		}

		for (let i = 0; i < long.length; i += split) {
			const part = long.slice(i, i + 4000);

			const chunk = i / split;

			await cookieStore.set({
				name: id + chunk,
				value: part,
				expires: expiration.getTime(),
				path: '/',
			});
		}

		encodeCookie(JSON.stringify(response));

		await cookieStore.set({
			name: id,
			value: mainCookieValue,
			expires: expiration.getTime(),
			path: '/',
		});

		return new Response();
	});
}
