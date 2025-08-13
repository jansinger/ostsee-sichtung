import { getToken, setAuthCookie, verifyToken } from '$lib/auth/auth.js';
import { createLogger } from '$lib/logger';
import type { User } from '$lib/types/types';
import { error, redirect } from '@sveltejs/kit';

const logger = createLogger('auth:auth0');

export async function GET({ url, cookies }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	let returnUrl = url.searchParams.get('returnUrl') || '/';

	if (returnUrl.includes('/__data.json')) {
		returnUrl = returnUrl.replace('/__data.json', '');
	}

	const csrfState = cookies.get('csrfState');

	if (state !== csrfState || !code) {
		throw error(403, 'Invalid state');
	}

	try {
		logger.debug({ code }, 'code');

		// Token-Austausch mit Auth0
		const token = await getToken({ code });
		logger.debug({ token }, 'token');

		//const authDetails = await getAccessToken(token.access_token);
		//logger.debug({ authDetails }, 'authDetails');

		const authUser = (await verifyToken(token.id_token)) as User;
		logger.debug({ authUser }, 'authUser');

		setAuthCookie(cookies, authUser);
		cookies.delete('csrfState', { path: '/' });
	} catch (err) {
		logger.info({ err }, 'Failed to get token');
		return error(500, `Failed to get token. Err: ${err}`);
	}
	return redirect(302, returnUrl);
}
