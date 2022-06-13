// import createHttpError from 'http-errors';

import StompURL from '../StompURL';

const rewrites: { [key: string]: (url: StompURL) => Promise<Response> } = {
	async html(url: StompURL) {
		return new Response(url.toString(), {
			status: 200,
		});
	},
};

export default rewrites;
