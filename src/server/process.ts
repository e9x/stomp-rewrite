import { routeHTML } from '../rewriteHTML.js';
import StompURL from '../StompURL.js';

export default async function process(url: StompURL): Promise<Response> {
	return new Response(undefined, {
		headers: {
			location: routeHTML(url, url),
		},
		status: 307,
	});
}
