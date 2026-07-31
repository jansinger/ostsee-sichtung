/**
 * Prüfung der Produktions-Secrets beim Serverstart.
 *
 * Reine Funktionen ohne Env-Zugriff: Die Werte kommen als Parameter herein, damit sie
 * testbar sind. Der Aufruf und das Werfen passieren in `src/hooks.server.ts`.
 *
 * Hintergrund: Issue #635 — ein Deployment, das `.env.example` als Vorlage übernimmt,
 * lief bisher mit einem Secret, das im öffentlichen Repository steht.
 *
 * **Die `SESSION_SECRET`-Prüfung ist mit dem Session-Store entfallen.** Sie war Paket A
 * der Spec und ausdrücklich als Übergang gedacht: Seit die Session serverseitig liegt,
 * signiert die App kein eigenes JWT mehr, und die Variable existiert nicht mehr. Ein Guard
 * auf einen Wert, den niemand liest, wäre irreführend.
 */

const ENCRYPTION_KEY_HINT = 'Erzeugen mit: openssl rand -hex 32';

/**
 * Platzhalter-Wert aus `.env.example` (64x "0") — NIE in Produktion nutzen.
 */
export const PLACEHOLDER_ENCRYPTION_KEY = '0'.repeat(64);

/**
 * `crypto.ts` nutzt aes-256-gcm. Das verlangt exakt 32 Byte Schlüssel,
 * hex-kodiert also 64 Zeichen.
 */
export const ENCRYPTION_KEY_LENGTH = 64;

const HEX_ONLY = /^[0-9a-f]+$/i;

/**
 * Prüft einen `ENCRYPTION_KEY`-Wert.
 *
 * @returns `null` wenn gültig, sonst die vollständige Fehlermeldung.
 */
export function validateEncryptionKey(raw: string): string | null {
	/* Trimmen vor dem Vergleich, analog zu validateSessionSecret: sonst umgeht umgebender
	   Leerraum die Platzhalter-Prüfung und die Fehlermeldung nennt die falsche Ursache
	   (Längenfehler statt Platzhalter). */
	const value = raw.trim();

	if (!value) {
		return `ENCRYPTION_KEY ist in Produktion erforderlich. ${ENCRYPTION_KEY_HINT}`;
	}
	if (value === PLACEHOLDER_ENCRYPTION_KEY) {
		return (
			'ENCRYPTION_KEY ist der Platzhalter aus der Beispiel-Konfiguration. ' +
			`Die Verschlüsselung des PKCE-Verifiers wäre damit wirkungslos. ${ENCRYPTION_KEY_HINT}`
		);
	}
	if (value.length !== ENCRYPTION_KEY_LENGTH) {
		return (
			`ENCRYPTION_KEY muss genau ${ENCRYPTION_KEY_LENGTH} Zeichen lang sein ` +
			`(32 Byte für aes-256-gcm), ist aber ${value.length}. ${ENCRYPTION_KEY_HINT}`
		);
	}
	if (!HEX_ONLY.test(value)) {
		return (
			'ENCRYPTION_KEY muss hexadezimal sein (nur 0-9 und a-f, Grossbuchstaben A-F sind ' +
			`ebenfalls erlaubt). ${ENCRYPTION_KEY_HINT}`
		);
	}
	return null;
}

/**
 * Prüft beim Serverstart alle Produktions-Secrets und wirft mit einer Meldung, die
 * **alle** gefundenen Probleme nennt — ein Betreiber, der nur den ersten sieht, deployt
 * zweimal.
 *
 * Aktuell bleibt davon nur `ENCRYPTION_KEY`; die Sammel-Struktur steht, weil sie beim
 * nächsten geprüften Wert sonst wieder eingeführt werden müsste.
 */
export function assertProductionSecrets(env: { NODE_ENV: string; ENCRYPTION_KEY: string }): void {
	/* Groß-/Kleinschreibung und umgebender Leerraum dürfen den Guard nicht abschalten
	   ("Production", " production ", "PRODUCTION" sind gemeint). Eine Kurzform wie "prod"
	   gilt bewusst NICHT als Produktion: SvelteKit und die Skripte dieses Projekts setzen
	   durchgehend "production" — eine Zusatzbedeutung zu erfinden wäre eine eigene
	   Entscheidung, die dieser Guard nicht treffen soll. */
	const normalizedNodeEnv = env.NODE_ENV.trim().toLowerCase();
	if (normalizedNodeEnv !== 'production') {
		return;
	}

	const problems = [validateEncryptionKey(env.ENCRYPTION_KEY)].filter(
		(problem): problem is string => problem !== null
	);

	if (problems.length > 0) {
		throw new Error(
			`Ungültige Produktions-Konfiguration:\n- ${problems.join('\n- ')}\n` +
				'Der Server startet aus Sicherheitsgründen nicht.'
		);
	}
}
