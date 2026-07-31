import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/logger.server';
import { resolveSessionUser } from '$lib/server/auth/sessionRepository';
import { assertProductionSecrets } from '$lib/server/config/secretGuard';
import { closeDb } from '$lib/server/db';
import { databaseCheck } from '$lib/server/middleware/databaseCheck';
import { maintenanceMode } from '$lib/server/middleware/maintenanceMode';
import { createSecurityHeadersHandler } from '$lib/server/middleware/securityHeaders';
import { buildErrorLogFields } from '$lib/server/utils/errorChain';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { randomUUID } from 'crypto';

// Dynamic environment variables for Docker runtime
const NODE_ENV = env.NODE_ENV ?? 'development';
const ENCRYPTION_KEY = env.ENCRYPTION_KEY ?? '';

const logger = createLogger('hooks:server');

// Guard: Der Server startet in Produktion nicht mit einem fehlenden oder unbrauchbaren
// ENCRYPTION_KEY. Die Prüflogik steht in secretGuard.ts, damit sie testbar ist —
// hooks.server.ts liegt ausserhalb von src/lib/** und wird von den Server-Tests nicht erfasst.
// SESSION_SECRET wird seit dem Session-Store (#635) nicht mehr verwendet und deshalb auch
// nicht mehr geprüft.
assertProductionSecrets({ NODE_ENV, ENCRYPTION_KEY });

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
	const url = new URL(event.request.url);

	logger.debug({ pathname: url.pathname }, 'Authentication check');

	/* Die Ableitung Cookie -> Benutzer steht bewusst in sessionRepository.ts und nicht hier:
	   Der Modul-Scope dieser Datei (Startup-Guards, sequence()) macht sie sonst untestbar,
	   und genau diese Ableitung ist der Punkt, an dem #635 bewiesen wird. */
	const session = await resolveSessionUser(event.cookies);
	if (session) {
		logger.debug({ userSub: session.user.sub }, 'Authenticated user');
		event.locals.user = session.user;
		event.locals.isAdmin = session.user.roles?.includes('admin') || false;
		// Grundlage für die Ablauf-Ankündigung aus #634 (siehe +layout.server.ts)
		event.locals.sessionExpiresAt = session.expiresAt;
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
 *
 * `causes` ist bei Datenbankfehlern das entscheidende Feld: Drizzle/postgres-js setzen
 * als `message` immer nur "Failed query: <SQL>", die eigentliche Ursache
 * (Verbindungsabbruch, `too many connections`, Timeout) steht ausschließlich in
 * `error.cause`. Ohne dieses Feld ist ein Ausfall aus dem Log nicht rekonstruierbar.
 *
 * Alle drei Fehler-Felder kommen aus `buildErrorLogFields` — sie hier von Hand aus
 * `error.message`/`error.stack` zusammenzusetzen hiesse, die Redigierung an genau den
 * Feldern vorbeizuführen, die Drizzles Parameterblock tragen. Die Logik steht in
 * `errorChain.ts`, damit sie testbar ist; `hooks.server.ts` liegt ausserhalb von
 * `src/lib/**` und wird von den Server-Tests nicht erfasst.
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
			...buildErrorLogFields(error)
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
