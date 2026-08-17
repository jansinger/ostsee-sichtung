/**
 * Leitet ab, welche Software eine Sichtung erzeugt hat (Spalte `eingangs_client`).
 *
 * Der Wert wird ausschließlich serverseitig bestimmt und nie aus dem
 * Request-Body übernommen — ein Client könnte sich sonst beliebig ausgeben,
 * und das Feld wäre als Diagnosegröße wertlos. Verifizierbar ist er trotzdem
 * nicht: Der User-Agent ist frei wählbar. Er ist ein Hinweis, kein Beweis, und
 * darf nie Grundlage einer Zugriffs- oder Gültigkeitsentscheidung werden.
 *
 * Die Ableitung hängt am Aufrufer, NICHT an `entryChannel`: Trägt jemand eine
 * per Post eingegangene Meldung über das Webformular ein, ist der Eingangskanal
 * `MAIL`, geschrieben hat die Zeile aber `web/<version>`. Die beiden Spalten
 * beantworten verschiedene Fragen und dürfen sich nicht gegenseitig ableiten.
 */

/** Steht in der Spalte, wenn kein User-Agent ermittelbar war. */
export const UNKNOWN_ENTRY_CLIENT = 'unbekannt';

/** Entspricht `varchar('eingangs_client', { length: 128 })` im Schema. */
export const MAX_ENTRY_CLIENT_LENGTH = 128;

export type EntryClientInput =
	{ source: 'web'; appVersion: string } | { source: 'agent'; userAgent: string | null | undefined };

export function resolveEntryClient(input: EntryClientInput): string {
	const value =
		input.source === 'web' ? fromAppVersion(input.appVersion) : fromUserAgent(input.userAgent);

	return truncate(value);
}

function fromAppVersion(appVersion: string): string {
	const version = appVersion.trim();
	return version === '' ? UNKNOWN_ENTRY_CLIENT : `web/${version}`;
}

function fromUserAgent(userAgent: string | null | undefined): string {
	// Kein Wurf und kein Leerstring: Ein Request ohne User-Agent ist kein
	// Fehlerfall — die Meldung ist wichtiger als ihre Herkunftsnotiz. NULL
	// bleibt dem Altbestand vorbehalten, deshalb hier ein sprechender Wert.
	const agent = (userAgent ?? '').trim();
	return agent === '' ? UNKNOWN_ENTRY_CLIENT : agent;
}

function truncate(value: string): string {
	return value.length <= MAX_ENTRY_CLIENT_LENGTH
		? value
		: `${value.slice(0, MAX_ENTRY_CLIENT_LENGTH - 1)}…`;
}
