import type { Handle } from '@sveltejs/kit';

/**
 * SvelteKit Handle Hook - Nicht-CSP Security Headers
 * 
 * WICHTIG: CSP wird in svelte.config.js konfiguriert (Vercel-optimiert)
 * Hier werden nur zusätzliche Security Headers gesetzt
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Zusätzliche Security Headers (CSP ist in svelte.config.js)
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

	// HSTS für Production (nur bei HTTPS)
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// Development-spezifische Headers
	if (process.env.NODE_ENV === 'development') {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	}

	// Cookie-Sicherheit für iframe-Kontext
	const existingCookies = response.headers.get('Set-Cookie');
	if (existingCookies) {
		// SameSite=None für iframe-Funktionalität (nur mit Secure)
		const iframeFriendlyCookies = existingCookies.replace(
			/SameSite=Strict/g, 
			'SameSite=None; Secure'
		);
		response.headers.set('Set-Cookie', iframeFriendlyCookies);
	}

	return response;
};
