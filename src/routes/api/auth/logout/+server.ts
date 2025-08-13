import { AUTH0_CLIENT_ID, AUTH0_DOMAIN, COOKIE_NAME } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

export async function GET({ cookies }) {
	// we need to remove the loggedIN cookie
	cookies.delete(COOKIE_NAME, { path: '/' });

	return redirect(
		302,
		`https://${AUTH0_DOMAIN}/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=${PUBLIC_SITE_URL}`
	);
}
