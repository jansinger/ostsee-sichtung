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
