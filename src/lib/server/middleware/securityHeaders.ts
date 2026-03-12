import type { Handle } from '@sveltejs/kit';

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
			response.headers.set(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains'
			);
		}

		// Development-specific CORS headers
		if (nodeEnv === 'development') {
			response.headers.set('Access-Control-Allow-Origin', '*');
			response.headers.set(
				'Access-Control-Allow-Methods',
				'GET, POST, PUT, DELETE, OPTIONS'
			);
			response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}

		// Cookie security for iframe context
		const existingCookies = response.headers.get('Set-Cookie');
		if (existingCookies) {
			// SameSite=None for iframe functionality (only with Secure)
			const iframeFriendlyCookies = existingCookies.replace(
				/SameSite=Strict/g,
				'SameSite=None; Secure'
			);
			response.headers.set('Set-Cookie', iframeFriendlyCookies);
		}

		return response;
	};
}
