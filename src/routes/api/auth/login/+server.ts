import { API_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';
export async function GET({ cookies, url }) {
	const csrfState = Math.random().toString(36).substring(7);
	cookies.set('csrfState', csrfState, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 1000,
		path: '/'
	});

	const returnUrl = encodeURIComponent(url.searchParams.get('returnUrl') || '/');

	const query = {
		scope: 'openid profile email',
		response_type: 'code',
		client_id: AUTH0_CLIENT_ID,
		redirect_uri: `${PUBLIC_SITE_URL}/api/auth/callback?returnUrl=${returnUrl}`,
		state: csrfState,
		audience: API_AUDIENCE
	};

	throw redirect(302, `https://${AUTH0_DOMAIN}/authorize?${new URLSearchParams(query).toString()}`);
}
