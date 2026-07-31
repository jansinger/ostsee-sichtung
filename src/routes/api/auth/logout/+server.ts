import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { destroySession } from '$lib/server/auth/sessionRepository';
import { redirect, type Cookies } from '@sveltejs/kit';

export async function GET({ cookies, locals }: { cookies: Cookies; locals: App.Locals }) {
	const userEmail = locals.user?.email;

	/* destroySession statt nur das Cookie zu loeschen: Bis zum Session-Store blieb das
	   signierte JWT nach dem Logout gueltig — wer es behielt, war weiter angemeldet (B7
	   aus docs/SESSION_STORE_SPEC_2026-07-31.md). Jetzt ist der Wert serverseitig tot. */
	await destroySession(cookies);

	void logAuditEvent({
		action: 'auth.logout',
		resourceType: 'auth',
		...(userEmail ? { userEmail } : {})
	});

	const publicSiteUrl = publicEnv.PUBLIC_SITE_URL ?? 'http://localhost:3000';
	return redirect(
		302,
		`https://${env.AUTH0_DOMAIN}/logout?client_id=${env.AUTH0_CLIENT_ID}&returnTo=${publicSiteUrl}`
	);
}
