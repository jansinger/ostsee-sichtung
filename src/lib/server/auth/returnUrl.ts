/**
 * Validiert eine returnUrl gegen Open-Redirect-Angriffe.
 *
 * Erlaubt ausschließlich relative Same-Origin-Pfade, die mit genau einem `/`
 * beginnen. Externe URLs (`https://evil.com`), protokoll-relative Pfade
 * (`//evil.com`) und Backslash-Tricks (`/\evil.com`) werden auf `/` normalisiert.
 *
 * Liegt in einem eigenen Modul (nicht in `+server.ts`), weil SvelteKit aus
 * `+server.ts` nur bestimmte Exports erlaubt.
 */
export function sanitizeReturnUrl(returnUrl: string | null | undefined): string {
	if (typeof returnUrl !== 'string' || returnUrl.length === 0) {
		return '/';
	}
	// Whitespace-Zeichen ablehnen. Der WHATWG-URL-Parser entfernt
	// Tab/CR/LF VOR der Auflösung, sodass z.B. '/\t/evil.com' zu
	// 'http://evil.com/' würde und die startsWith-Prüfung unten umginge.
	// Legitime relative Pfade enthalten keine rohen Whitespace-Zeichen
	// (Leerzeichen wären %20-kodiert).
	if (/\s/.test(returnUrl)) {
		return '/';
	}
	// Muss mit genau einem '/' beginnen — keine protokoll-relativen ('//')
	// und keine Backslash-Pfade ('/\'), die Browser als externe URL interpretieren.
	if (!returnUrl.startsWith('/') || returnUrl.startsWith('//') || returnUrl.startsWith('/\\')) {
		return '/';
	}
	return returnUrl;
}
