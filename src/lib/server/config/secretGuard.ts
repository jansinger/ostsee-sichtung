/**
 * Prüfung der Produktions-Secrets beim Serverstart.
 *
 * Reine Funktionen ohne Env-Zugriff: Die Werte kommen als Parameter herein, damit sie
 * testbar sind. Der Aufruf und das Werfen passieren in `src/hooks.server.ts`.
 *
 * Hintergrund: Issue #635 — ein Deployment, das `.env.example` als Vorlage übernimmt,
 * lief bisher mit einem Secret, das im öffentlichen Repository steht.
 */

/**
 * Werte, die als `SESSION_SECRET` nie gelten dürfen, weil sie öffentlich einsehbar sind.
 *
 * Beide sind 33 Zeichen lang und bestehen damit jede reine Mindestlängenprüfung — der
 * Vergleich gegen diese Menge ist deshalb nicht optional.
 */
export const PUBLIC_SESSION_SECRETS: ReadonlySet<string> = new Set([
	'your-secret-key-here-min-32-chars', // .env.example
	'8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE' // docs/ENVIRONMENT.md
]);

export const MIN_SESSION_SECRET_LENGTH = 32;

const GENERATE_HINT = 'Erzeugen mit: openssl rand -base64 32';

/**
 * Prüft einen `SESSION_SECRET`-Wert.
 *
 * @returns `null` wenn gültig, sonst die vollständige Fehlermeldung.
 */
export function validateSessionSecret(raw: string): string | null {
	/* Trimmen vor dem Vergleich, sonst umgeht ein versehentliches Leerzeichen oder ein
	   Zeilenumbruch (`openssl rand -base64 32 > datei`) die Prüfung gegen die bekannten
	   Werte — der Guard wäre dann still wirkungslos. */
	const value = raw.trim();

	if (!value) {
		return `SESSION_SECRET ist in Produktion erforderlich. ${GENERATE_HINT}`;
	}
	if (value.length < MIN_SESSION_SECRET_LENGTH) {
		return (
			`SESSION_SECRET ist zu kurz (${value.length} Zeichen, mindestens ` +
			`${MIN_SESSION_SECRET_LENGTH} erforderlich). ${GENERATE_HINT}`
		);
	}
	if (PUBLIC_SESSION_SECRETS.has(value)) {
		return (
			'SESSION_SECRET ist ein öffentlich bekannter Beispielwert aus dem Repository. ' +
			`Wer ihn kennt, kann sich eine Admin-Session ausstellen. ${GENERATE_HINT}`
		);
	}
	return null;
}

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
export function validateEncryptionKey(value: string): string | null {
	const hint = 'Erzeugen mit: openssl rand -hex 32';

	if (!value) {
		return `ENCRYPTION_KEY ist in Produktion erforderlich. ${hint}`;
	}
	if (value === PLACEHOLDER_ENCRYPTION_KEY) {
		return (
			'ENCRYPTION_KEY ist der Platzhalter aus der Beispiel-Konfiguration. ' +
			`Die Verschlüsselung des PKCE-Verifiers wäre damit wirkungslos. ${hint}`
		);
	}
	if (value.length !== ENCRYPTION_KEY_LENGTH) {
		return (
			`ENCRYPTION_KEY muss genau ${ENCRYPTION_KEY_LENGTH} Zeichen lang sein ` +
			`(32 Byte für aes-256-gcm), ist aber ${value.length}. ${hint}`
		);
	}
	if (!HEX_ONLY.test(value)) {
		return `ENCRYPTION_KEY muss hexadezimal sein (nur 0-9 und a-f). ${hint}`;
	}
	return null;
}

/**
 * Prüft beim Serverstart alle Produktions-Secrets und wirft mit einer Meldung,
 * die **alle** gefundenen Probleme nennt.
 *
 * Beide Fehler gemeinsam zu melden ist Absicht: Ein Betreiber, der nur den ersten
 * sieht, deployt zweimal.
 */
export function assertProductionSecrets(env: {
	NODE_ENV: string;
	SESSION_SECRET: string;
	ENCRYPTION_KEY: string;
}): void {
	if (env.NODE_ENV !== 'production') {
		return;
	}

	const problems = [
		validateSessionSecret(env.SESSION_SECRET),
		validateEncryptionKey(env.ENCRYPTION_KEY)
	].filter((problem): problem is string => problem !== null);

	if (problems.length > 0) {
		throw new Error(
			`Ungültige Produktions-Konfiguration:\n- ${problems.join('\n- ')}\n` +
				'Der Server startet aus Sicherheitsgründen nicht.'
		);
	}
}
