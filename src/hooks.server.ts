import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/logger.server';
import { clearAuthCookie, setAuthCookie } from '$lib/server/auth/auth';
import { assertProductionSecrets } from '$lib/server/config/secretGuard';
import { closeDb } from '$lib/server/db';
import { databaseCheck } from '$lib/server/middleware/databaseCheck';
import { maintenanceMode } from '$lib/server/middleware/maintenanceMode';
import { createSecurityHeadersHandler } from '$lib/server/middleware/securityHeaders';
import type { User } from '$lib/types/index';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { randomUUID } from 'crypto';
import { jwtVerify } from 'jose';

// Dynamic environment variables for Docker runtime
const COOKIE_NAME = env.COOKIE_NAME ?? 'auth-cookie';
const NODE_ENV = env.NODE_ENV ?? 'development';
const SESSION_SECRET = env.SESSION_SECRET ?? '';
const ENCRYPTION_KEY = env.ENCRYPTION_KEY ?? '';

const logger = createLogger('hooks:server');

// Guard: Der Server startet in Produktion nicht mit fehlenden, zu kurzen oder öffentlich
// bekannten Secrets. Die Prüflogik steht in secretGuard.ts, damit sie testbar ist —
// hooks.server.ts liegt ausserhalb von src/lib/** und wird von den Server-Tests nicht erfasst.
assertProductionSecrets({ NODE_ENV, SESSION_SECRET, ENCRYPTION_KEY });

const setAdditionalHeaders: Handle = createSecurityHeadersHandler(NODE_ENV);

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

	// Hinweis: Es wird bewusst KEIN CSP-Nonce erzeugt. Das CSP in svelte.config.js
	// nutzt 'unsafe-inline' (für die Scalar-API-Doku), daher hätte ein Nonce keine
	// Schutzwirkung. Um keine falsche Sicherheit vorzutäuschen, wurde der frühere
	// (nirgends verwendete) Nonce-Code entfernt.

	// Authentication
	const cookie = event.cookies.get(COOKIE_NAME);
	const url = new URL(event.request.url);

	logger.debug({ pathname: url.pathname }, 'Authentication check');

	let user = null;
	if (cookie) {
		try {
			// Extend the cookie
			const secret = new TextEncoder().encode(SESSION_SECRET);
			const { payload } = await jwtVerify(cookie, secret);
			user = payload as unknown as User;
			logger.debug({ userSub: user?.sub }, 'Authenticated user');
			await setAuthCookie(event.cookies, user);
			// Set user in locals for access in components
			event.locals.user = user;
			// Set admin flag for easier access
			event.locals.isAdmin = user?.roles?.includes('admin') || false;
		} catch (error) {
			logger.error({ event: 'security.auth_error', error }, 'Failed to verify cookie, deleting it');
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
	databaseCheck, // First: Check database availability
	maintenanceMode, // Second: Check maintenance mode
	authentication, // Third: Handle authentication
	setAdditionalHeaders // Fourth: Set security headers
);

/**
 * Zentraler Error-Hook für unerwartete (nicht abgefangene) Server-Fehler.
 *
 * Loggt den Fehler strukturiert über Pino (inkl. Stack, Pfad, Status und einer
 * korrelierbaren errorId) und gibt dem Client nur eine generische Meldung zurück,
 * damit keine internen Details (Stacktraces, DB-Fehler) nach außen gelangen.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = randomUUID();

	logger.error(
		{
			event: 'unhandled_error',
			errorId,
			status,
			message,
			pathname: event.url.pathname,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		},
		'Unerwarteter Serverfehler'
	);

	return {
		message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
		errorId
	};
};

/**
 * Graceful Shutdown: schließt die DB-Verbindung sauber bei SIGTERM/SIGINT
 * (z.B. `docker stop`). Idempotent — ein bereits laufender Shutdown wird nicht
 * doppelt ausgeführt. Das Dockerfile nutzt `dumb-init`, daher kommen die Signale
 * korrekt am Node-Prozess an.
 */
let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;

	logger.info({ signal }, 'Graceful shutdown initiiert');

	try {
		await closeDb();
		logger.info({ signal }, 'Datenbankverbindung geschlossen');
	} catch (error) {
		logger.error(
			{ signal, error: error instanceof Error ? error.message : String(error) },
			'Fehler beim Schließen der Datenbankverbindung'
		);
	} finally {
		process.exit(0);
	}
}

if (typeof process !== 'undefined' && NODE_ENV !== 'test') {
	process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));
	process.once('SIGINT', () => void gracefulShutdown('SIGINT'));
}
