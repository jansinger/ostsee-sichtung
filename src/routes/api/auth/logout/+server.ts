import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { clearAuthCookie } from '$lib/server/auth/auth.js';
import { redirect, type Cookies } from '@sveltejs/kit';

export async function GET({ cookies }: { cookies: Cookies }) {
	// we need to remove the loggedIN cookie
	clearAuthCookie(cookies);

	const publicSiteUrl = publicEnv.PUBLIC_SITE_URL ?? 'http://localhost:3000';
	return redirect(
		302,
		`https://${env.AUTH0_DOMAIN}/logout?client_id=${env.AUTH0_CLIENT_ID}&returnTo=${publicSiteUrl}`
	);
}
