import { API_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { setCsrfCookie, setPKCECookie } from '$lib/server/auth/auth';
import { redirect, type Cookies } from '@sveltejs/kit';
export async function GET({ url, cookies }: { url: URL; cookies: Cookies }) {
	const csrfState = setCsrfCookie(cookies);
	const returnUrl = encodeURIComponent(url.searchParams.get('returnUrl') || '/');
	const challenge = setPKCECookie(cookies);
	const query = {
		scope: 'openid profile email',
		response_type: 'code',
		client_id: AUTH0_CLIENT_ID,
		redirect_uri: `${PUBLIC_SITE_URL}/api/auth/callback?returnUrl=${returnUrl}`,
		state: csrfState,
		audience: API_AUDIENCE,
		code_challenge: challenge,
		code_challenge_method: 'S256'
	};

	throw redirect(302, `https://${AUTH0_DOMAIN}/authorize?${new URLSearchParams(query).toString()}`);
}
