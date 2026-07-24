import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

// Name des Session-Cookies (identisch zu auth.ts / hooks.server.ts).
// Nur dieser Cookie wird für die iframe-Einbettung auf SameSite=None umgeschrieben.
const COOKIE_NAME = env.COOKIE_NAME ?? 'auth-cookie';

export function createSecurityHeadersHandler(nodeEnv: string): Handle {
	return async ({ event, resolve }) => {
		const response = await resolve(event);

		// Security Headers (CSP is configured in svelte.config.js)
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=*');
		response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

		// Cross-Origin headers
		response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
		response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

		// HSTS for production (HTTPS only)
		if (event.url.protocol === 'https:') {
			response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
		}

		// Development-specific CORS headers
		if (nodeEnv === 'development') {
			response.headers.set('Access-Control-Allow-Origin', '*');
			response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}

		// Cookie security for iframe context:
		// Nur der Session-Cookie (COOKIE_NAME) wird für die meeresmuseum.de-iframe-
		// Einbettung von SameSite=Strict auf SameSite=None; Secure umgeschrieben.
		// Ein globaler Rewrite über ALLE Set-Cookie-Header wäre zu breit und würde
		// auch fremde/kurzlebige Cookies unnötig cross-site freigeben.
		const setCookies = response.headers.getSetCookie?.() ?? [];
		if (setCookies.length > 0) {
			response.headers.delete('Set-Cookie');
			for (const cookie of setCookies) {
				if (cookie.startsWith(`${COOKIE_NAME}=`)) {
					response.headers.append(
						'Set-Cookie',
						cookie.replace(/SameSite=Strict/g, 'SameSite=None; Secure')
					);
				} else {
					response.headers.append('Set-Cookie', cookie);
				}
			}
		}

		return response;
	};
}
