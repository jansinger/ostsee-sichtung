import { COOKIE_NAME, NODE_ENV, SESSION_SECRET } from '$env/static/private';
import { createLogger } from '$lib/logger';
import { clearAuthCookie, setAuthCookie } from '$lib/server/auth/auth';
import { maintenanceMode } from '$lib/server/middleware/maintenanceMode';
import type { User } from '$lib/types/index';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const logger = createLogger('hooks:server');

const setAdditionalHeaders: Handle = async ({ event, resolve }) => {
	// Additional Headers
	const response = await resolve(event);

	// Zusätzliche Security Headers (CSP ist in svelte.config.js)
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=*');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

	// HSTS für Production (nur bei HTTPS)
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// Development-spezifische Headers
	if (NODE_ENV === 'development') {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		response.headers.set('Access-Control-Allow-Credentials', 'true');
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

/**
 * Authentication handler
 */
const authentication: Handle = async ({ event, resolve }) => {
	// Disable CSRF protection for legacy REST API endpoints (mobile app compatibility)
	if (event.url.pathname.startsWith('/rest_sichtungen')) {
		logger.debug(
			{ pathname: event.url.pathname },
			'Processing legacy API endpoint - CSRF bypass needed'
		);
		// SvelteKit's CSRF protection can be bypassed by handling in the route itself
	}

	// Generate CSP nonce
	const nonce = randomBytes(16).toString('base64');
	event.locals.cspNonce = nonce;

	// Authentication
	const cookie = event.cookies.get(COOKIE_NAME);
	const url = new URL(event.request.url);

	logger.debug({ pathname: url.pathname }, 'Authentication check');

	let user = null;
	if (cookie) {
		try {
			// Extend the cookie
			user = jwt.verify(cookie, SESSION_SECRET) as User;
			logger.debug({ userSub: user?.sub }, 'Authenticated user');
			setAuthCookie(event.cookies, user);
			// Set user in locals for access in components
			event.locals.user = user;
			// Set admin flag for easier access
			event.locals.isAdmin = user?.roles?.includes('admin') || false;
		} catch (error) {
			logger.error({ error }, 'Failed to verify cookie, deleting it');
			clearAuthCookie(event.cookies);
		}
	}

	return resolve(event);
};

/**
 * SvelteKit Handle Hook - Combines multiple middleware in sequence
 *
 * WICHTIG: CSP wird in svelte.config.js konfiguriert (Vercel-optimiert)
 * Hier werden Middleware in der richtigen Reihenfolge ausgeführt
 */
export const handle: Handle = sequence(
	maintenanceMode, // First: Check maintenance mode
	authentication, // Second: Handle authentication
	setAdditionalHeaders // Third: Set security headers
);
