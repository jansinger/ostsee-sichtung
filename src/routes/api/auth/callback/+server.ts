import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/logger.server';
import { logAuditEvent } from '$lib/server/audit/auditService';
import {
	getPKCEVerifierFromCookie,
	getToken,
	getTokenClaims,
	verifyToken
} from '$lib/server/auth/auth.js';
import { createSession } from '$lib/server/auth/sessionRepository';
import { sanitizeReturnUrl } from '$lib/server/auth/returnUrl';
import type { User } from '$lib/types';
import { error, redirect, type Cookies } from '@sveltejs/kit';

const logger = createLogger('auth:auth0');

export async function GET({ url, cookies }: { url: URL; cookies: Cookies }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	let returnUrl = url.searchParams.get('returnUrl') || '/';

	if (returnUrl.includes('/__data.json')) {
		returnUrl = returnUrl.replace('/__data.json', '');
	}

	const csrfState = cookies.get('csrfState');
	const pkceVerifier = getPKCEVerifierFromCookie(cookies);

	if (state !== csrfState || !code || !pkceVerifier) {
		logger.warn(
			{
				event: 'security.csrf_mismatch',
				stateMatch: state === csrfState,
				hasCode: !!code,
				hasPkce: !!pkceVerifier
			},
			'Auth callback: CSRF state mismatch or missing parameters'
		);
		throw error(403, 'Invalid state');
	}

	try {
		// Token-Austausch mit Auth0
		const token = await getToken({ code, pkceVerifier });

		const authUser = (await verifyToken(token.id_token)) as User;

		const rolesClaim = `${env.API_AUDIENCE}/roles`;
		const claims = await getTokenClaims<Record<string, string[]>>(token.access_token);

		authUser.roles = claims[rolesClaim] || [];

		await createSession(cookies, authUser);
		// Fire-and-forget: audit write must not delay the redirect (login latency)
		void logAuditEvent({
			action: 'auth.login_success',
			resourceType: 'auth',
			userEmail: authUser.email
		});
		cookies.delete('csrfState', { path: '/' });
		// Open-Redirect-Schutz: nur relative Same-Origin-Pfade zulassen
		redirect(302, sanitizeReturnUrl(returnUrl));
	} catch (err) {
		// SvelteKit redirect() throws internally — re-throw without treating as error
		if (err instanceof Response || (err as { status?: number })?.status === 302) {
			throw err;
		}
		logger.warn({ event: 'security.auth_error', err }, 'Failed to get token');
		await logAuditEvent({
			action: 'auth.login_failure',
			resourceType: 'auth',
			status: 'failure'
		});
		return error(500, 'Authentication failed');
	}
}
