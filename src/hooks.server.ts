import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/logger.server';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { resolveSessionUser } from '$lib/server/auth/sessionRepository';
import { assertProductionSecrets } from '$lib/server/config/secretGuard';
import { closeDb } from '$lib/server/db';
import { databaseCheck } from '$lib/server/middleware/databaseCheck';
import { maintenanceMode } from '$lib/server/middleware/maintenanceMode';
import { createSecurityHeadersHandler } from '$lib/server/middleware/securityHeaders';
import { warnIfBodySizeLimitTooLow } from '$lib/server/startup/bodySizeLimit';
import { formatStartupBanner, getBuildInfo } from '$lib/server/startup/versionInfo';
import { buildErrorLogEntry } from '$lib/server/utils/errorChain';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { ServerConfigService } from '$lib/services/configService';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { randomUUID } from 'crypto';

// Dynamic environment variables for Docker runtime
const NODE_ENV = env.NODE_ENV ?? 'development';
const ENCRYPTION_KEY = env.ENCRYPTION_KEY ?? '';

const logger = createLogger('hooks:server');

// gitSha/buildDate kommen aus den Docker-Build-Args VCS_REF/BUILD_DATE (siehe Dockerfile)
// und existieren nur im Container-Image. Ein lokaler `npm run dev` hat sie nicht —
// formatStartupBanner zeigt das dann bewusst als "unknown", statt eine falsche
// Versionsangabe vorzutäuschen.
const buildInfo = getBuildInfo();
logger.info({ ...buildInfo, nodeEnv: NODE_ENV }, formatStartupBanner(buildInfo, NODE_ENV));

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
 * Löst die Locale serverseitig auf und ersetzt `%lang%` im ausgelieferten HTML.
 *
 * Ohne diesen Schritt gibt es keine serverseitig bekannte Sprache — SSR rendert
 * dann in der Standardsprache, während der Client umschaltet, und der
 * Platzhalter bliebe wörtlich im Dokument stehen.
 *
 * Steht bewusst NACH der Auth-Prüfung: Die hängt an `event.url.pathname`, und
 * dieser Pfad darf ihr nicht verschoben unter den Händen weggezogen werden. Die
 * Definition steht deshalb absichtlich direkt vor `sequence(...)` — unmittelbar
 * bei der Stelle, die ihre tatsächliche Ausführungsreihenfolge festlegt, statt
 * weiter oben in Lesereihenfolge vor `authentication` und damit im Widerspruch
 * zu genau dieser Aussage.
 *
 * `replaceAll` statt `replace`: Heute kommt `%lang%` genau einmal im Dokument
 * vor, aber ein künftiges zweites Vorkommen (z. B. `og:locale`, `hreflang`)
 * bliebe mit `replace` stillschweigend unersetzt im ausgelieferten HTML stehen.
 */
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replaceAll('%lang%', locale)
		});
	});

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
	setAdditionalHeaders, // Fourth: Set security headers
	handleParaglide // Fifth: Resolve locale and fill %lang% placeholder
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
 * Der gesamte Eintrag — Stufe, Meldung und Felder — kommt aus `buildErrorLogEntry`.
 * Ihn hier von Hand zusammenzusetzen hiesse, die Redigierung an genau den Feldern
 * vorbeizuführen, die Drizzles Parameterblock tragen. Die Logik steht in
 * `errorChain.ts`, damit sie testbar ist; `hooks.server.ts` liegt ausserhalb von
 * `src/lib/**` und wird von den Server-Tests nicht erfasst.
 *
 * Die Client-Antwort ist bewusst für jeden Status dieselbe generische Meldung: Was der
 * Nutzer sieht, ist die Fehlerseite; die Unterscheidung 404/500 gehört ins Log, nicht
 * in eine zweite Textvariante.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = randomUUID();

	const entry = buildErrorLogEntry({
		error,
		errorId,
		status,
		message,
		pathname: event.url.pathname,
		method: event.request.method,
		// getClientAddress() wirft, wenn ADDRESS_HEADER gesetzt, der Header aber nicht da ist —
		// im Error-Hook wäre das ein Fehler beim Loggen eines Fehlers. getClientIp fängt das ab.
		clientIp: getClientIp(event.getClientAddress, event.request),
		userAgent: event.request.headers.get('user-agent'),
		referer: event.request.headers.get('referer')
	});

	logger[entry.level](entry.fields, entry.msg);

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

// Einmalige Prüfung beim Start: Die Plattformgrenze für Request-Bodies muss
// über der konfigurierten Upload-Grenze liegen, sonst bricht ein zu großer
// Upload ab, bevor die Route ihre eigene Fehlermeldung erzeugen kann.
//
// Bewusst ohne await und mit eigenem catch: Ohne erreichbare Datenbank soll
// der Serverstart nicht scheitern — die Warnung ist ein Hinweis, keine
// Betriebsvoraussetzung.
void (async () => {
	try {
		const uploadConfig = await ServerConfigService.getUploadConfig();
		const maxUploadBytes = Math.max(
			uploadConfig.maxFileSizeBytes,
			uploadConfig.maxVideoFileSizeBytes
		);
		const warning = warnIfBodySizeLimitTooLow(env.BODY_SIZE_LIMIT, maxUploadBytes);
		if (warning) {
			logger.warn({ action: 'body_size_limit_too_low' }, warning);
		}
	} catch (error) {
		logger.debug({ error }, 'Body size limit check skipped — configuration unavailable');
	}
})();
