import type { BrowserContext } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { SignJWT } from 'jose';

/**
 * adminSession.ts — ein Admin-Login für E2E-Tests, ohne Auth0 anzufassen.
 *
 * **Warum nicht über die Login-Seite:** Auth0 sagt selbst, dass
 * `/u/login/identifier` und `/u/login/password` interne Routen der
 * Universal-Login-State-Engine sind und nicht für programmatischen Zugriff
 * gedacht — das Überspringen des Identifier-Schritts wird als ungültig
 * geflaggt, weil es Account-Enumeration verhindert. Dazu kommt Bot-Detection,
 * die auf Headless-Signale anspringt. Die Login-Oberfläche gehört Auth0; sie
 * in CI zu fahren testet fremden Code und bricht, wenn Auth0 ihn ändert.
 *
 * **Warum auch nicht Resource Owner Password Grant** (Auth0s dokumentierte
 * Empfehlung für „Verhalten hinter dem Login"): ROPG liefert ein *Auth0*-Token,
 * und dieses Token konsumiert die App nirgends. Ihr Flow ist Authorization
 * Code → Callback → `verifyToken` gegen JWKS → und dann stellt sie mit
 * `setAuthCookie` ihr **eigenes**, mit SESSION_SECRET signiertes JWT aus. Ab
 * da ist Auth0 raus. Ein ROPG-Token hätte hier kein Schlüsselloch, und es
 * einzurichten hieße, Password-Grant auf dem Produktions-Tenant zu aktivieren
 * (von Auth0 ausdrücklich verboten) oder einen zweiten Tenant zu betreiben.
 *
 * Deshalb setzt diese Datei Auth0s Grundsatz — nichts testen, was einem nicht
 * gehört — eine Schicht weiter innen um: an der Sessiongrenze der App. Genau
 * das empfiehlt auch Playwright als Alternative zum UI-Login (per API
 * authentifizieren, Cookie setzen).
 *
 * **Was dieser Weg NICHT prüft:** dass der Login funktioniert. Das ist Absicht.
 * Ein Test, der die Auth0-Oberfläche bedient, gehört nicht in die CI — wenn er
 * gebraucht wird, dann als bewusst manuell gefahrener Einzelfall.
 */

/* Playwright lädt .env nicht von sich aus. Ohne diesen Aufruf wäre
   SESSION_SECRET hier undefined, während der Dev-Server es über Vite sehr wohl
   sieht — der Test liefe dann in einen Login-Redirect und die Ursache stünde
   nirgends. In CI kommt die Datei aus `cp .env.example .env` (ci.yml); beide
   Seiten lesen damit denselben Wert, der Platzhalter genügt völlig. */
loadEnv();

/* Die funktional einzigen Felder sind `roles` (hooks.server.ts leitet daraus
   locals.isAdmin ab, requireUserRole prüft es) und `sub` (Logging). Der Rest
   füllt src/lib/types/User.ts auf, damit die Payload dem entspricht, was der
   echte Callback schreibt.

   Bewusst OHNE `exp`: Ein echtes Session-JWT erbt den Claim über
   `new SignJWT({ ...user })` aus dem ursprünglichen Auth0-Token und läuft
   deshalb mit diesem ab. Eine Testidentität soll das nicht — ein Fixture, das
   nach zehn Stunden anfängt zu scheitern, kostet mehr Zeit, als es Realismus
   bringt. Fehlt der Claim, prüft `jwtVerify` ihn nicht. */
const ADMIN_IDENTITY = {
	sub: 'e2e|design-tokens',
	name: 'E2E Design-Tokens',
	nickname: 'e2e',
	email: 'e2e@example.invalid',
	email_verified: true,
	picture: '',
	updated_at: '2026-01-01T00:00:00.000Z',
	sid: 'e2e-session',
	roles: ['admin']
};

/**
 * Legt ein gültiges Admin-Session-Cookie in den Browser-Context.
 *
 * Muss vor dem ersten `page.goto()` auf eine geschützte Route laufen.
 */
export async function seedAdminSession(context: BrowserContext, baseURL: string): Promise<void> {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error(
			'SESSION_SECRET fehlt — ohne das Secret kann kein Session-Cookie signiert werden. ' +
				'Lokal steht es in .env, in CI entsteht es aus .env.example (ci.yml, Schritt „Setup environment").'
		);
	}

	const token = await new SignJWT({ ...ADMIN_IDENTITY })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(new TextEncoder().encode(secret));

	/* sameSite bewusst 'Lax' statt des 'None', das setAuthCookie produziert.
	   'None' verlangt im Browser zwingend das Secure-Flag, und der CI-Dev-Server
	   läuft über plain http (vite.config.ci.ts lässt basicSsl weg, playwright.config.ts
	   zeigt in CI auf http://localhost:4000). 'Lax' entkoppelt das Fixture von
	   dieser Frage und reicht vollständig aus: Die Attribute steuern nur, WANN
	   der Browser den Cookie mitsendet, und die Tests navigieren ausschließlich
	   direkt auf die eigene Origin. Der Server liest nur den Wert.

	   Dass die App selbst 'None' braucht, ist eine Anforderung der
	   iframe-Einbettung auf meeresmuseum.de und wird hier nicht mitgetestet. */
	await context.addCookies([
		{
			name: process.env.COOKIE_NAME ?? 'auth-cookie',
			value: token,
			url: baseURL,
			httpOnly: true,
			secure: new URL(baseURL).protocol === 'https:',
			sameSite: 'Lax'
		}
	]);
}
