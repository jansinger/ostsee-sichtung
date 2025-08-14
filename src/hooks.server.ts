import { COOKIE_NAME, SESSION_SECRET } from '$env/static/private';
import { clearAuthCookie, setAuthCookie } from '$lib/auth/auth';
import { privateRoutes } from '$lib/constants/privateRoutes';
import { createLogger } from '$lib/logger';
import type { User } from '$lib/types/types';
import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const logger = createLogger('hooks:server');

const setAdditionalHeaders: Handle = async ({ event, resolve }) => {
	// Additional Headers
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

const hasPermission = (user: User | null, url: URL) => {
	const route = privateRoutes.find((route) => url.pathname.includes(route.path));
	// Route not restricted
	if (!route) return true;

	// No User authenticated
	if (!user) return false;

	// Check if the user's roles include any of the required roles for the route
	const hasRole = route.roles.some((role) => user.roles && user.roles.includes(role));
	return hasRole;
};

/**
 * SvelteKit Handle Hook - Nicht-CSP Security Headers
 *
 * WICHTIG: CSP wird in svelte.config.js konfiguriert (Vercel-optimiert)
 * Hier werden nur zusätzliche Security Headers gesetzt
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Authentication
	const cookie = event.cookies.get(COOKIE_NAME);
	const url = new URL(event.request.url);

	logger.info({ cookie, pathname: url.pathname }, 'Authentication check');

	let user = null;
	if (cookie) {
		try {
			// Extend the cookie
			user = jwt.verify(cookie, SESSION_SECRET) as User;
			logger.debug({ user }, 'Authenticated user');
			setAuthCookie(event.cookies, user);
			// Set user in locals for access in components
			event.locals.user = user;
		} catch (error) {
			logger.error({ error }, 'Failed to verify cookie, deleting it');
			clearAuthCookie(event.cookies);
		}
	}

	if (!hasPermission(user, url)) {
		if (user) {
			return new Response('Permission denied', { status: 403 });
		}
		return new Response('Login required', {
			status: 302,
			headers: { location: `/api/auth/login?returnUrl=${url.pathname}` }
		});
	}

	return await setAdditionalHeaders({ event, resolve });
};
