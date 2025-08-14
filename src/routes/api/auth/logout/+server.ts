import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { clearAuthCookie } from '$lib/auth/auth.js';
import { redirect } from '@sveltejs/kit';

export async function GET({ cookies }) {
	// we need to remove the loggedIN cookie
	clearAuthCookie(cookies);

	return redirect(
		302,
		`https://${AUTH0_DOMAIN}/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=${PUBLIC_SITE_URL}`
	);
}
