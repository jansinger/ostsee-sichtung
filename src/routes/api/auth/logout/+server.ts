import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { clearAuthCookie } from '$lib/server/auth/auth.js';
import { redirect, type Cookies } from '@sveltejs/kit';

export async function GET({ cookies }: { cookies: Cookies }) {
	// we need to remove the loggedIN cookie
	clearAuthCookie(cookies);

	return redirect(
		302,
		`https://${AUTH0_DOMAIN}/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=${PUBLIC_SITE_URL}`
	);
}
