import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/logger.server';
import { logAuditEvent } from '$lib/server/audit/auditService';
import {
	getPKCEVerifierFromCookie,
	getToken,
	getTokenClaims,
	setAuthCookie,
	verifyToken
} from '$lib/server/auth/auth.js';
import type { User } from '$lib/types';
import { error, redirect, type Cookies } from '@sveltejs/kit';

const logger = createLogger('auth:auth0');

/**
 * Validiert eine returnUrl gegen Open-Redirect-Angriffe.
 *
 * Erlaubt ausschließlich relative Same-Origin-Pfade, die mit genau einem `/`
 * beginnen. Externe URLs (`https://evil.com`), protokoll-relative Pfade
 * (`//evil.com`) und Backslash-Tricks (`/\evil.com`) werden auf `/` normalisiert.
 */
export function sanitizeReturnUrl(returnUrl: string | null | undefined): string {
	if (typeof returnUrl !== 'string' || returnUrl.length === 0) {
		return '/';
	}
	// Muss mit genau einem '/' beginnen — keine protokoll-relativen ('//')
	// und keine Backslash-Pfade ('/\'), die Browser als externe URL interpretieren.
	if (!returnUrl.startsWith('/') || returnUrl.startsWith('//') || returnUrl.startsWith('/\\')) {
		return '/';
	}
	return returnUrl;
}

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

		await setAuthCookie(cookies, authUser);
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
