/**
 * Prüft das M2M-Token des Aufräum-Endpunkts.
 *
 * Konstantzeitiger Vergleich, damit die Laufzeit nicht verrät, wie viele
 * Zeichen stimmen. Ein nicht oder zu kurz gesetztes `CLEANUP_TOKEN` schaltet
 * den externen Weg ab — es darf nie „alles erlaubt" bedeuten.
 */
import { timingSafeEqual } from 'node:crypto';

/** Kürzere Geheimnisse sind nicht brauchbar und gelten als nicht gesetzt. */
export const MIN_TOKEN_LENGTH = 32;

const PREFIX = 'Bearer ';

export function isValidCleanupToken(header: string | null, expected: string | undefined): boolean {
	if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
	if (!header?.startsWith(PREFIX)) return false;

	const provided = Buffer.from(header.slice(PREFIX.length));
	const reference = Buffer.from(expected);

	// timingSafeEqual wirft bei ungleicher Länge. Die Länge des Geheimnisses ist
	// kein schützenswertes Detail, sein Inhalt schon.
	if (provided.length !== reference.length) return false;
	return timingSafeEqual(provided, reference);
}
