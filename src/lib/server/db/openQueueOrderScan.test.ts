/**
 * @fileoverview Wächter: Eingangsliste und Queue-Endpunkt sortieren gleich.
 *
 * Die beiden Stellen müssen dieselbe Reihenfolge liefern, sonst überspringt der
 * Auto-Advance still eine Meldung. Ein Review bemerkt das nicht — die Zeilen
 * stehen in verschiedenen Dateien und sehen einzeln jeweils richtig aus.
 *
 * Der Test prüft deshalb **den Import**, nicht das Ergebnis: Wer künftig eine
 * eigene `orderBy(desc(sightings.created))`-Zeile schreibt, fällt hier auf.
 * Bewusst über den Quelltext und nicht über einen Laufzeitvergleich — ein
 * Vergleich zweier kompilierter SQL-Strings wäre grün, solange beide zufällig
 * gleich sind, und würde die eigentliche Regel (eine Quelle) nicht ausdrücken.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const QUELLEN = [
	'src/routes/admin/+page.server.ts',
	'src/routes/api/sightings/[id]/queue/+server.ts'
] as const;

describe('Ordnung des offenen Stapels', () => {
	it.each(QUELLEN)('%s importiert die gemeinsame Ordnung', (pfad) => {
		const quelltext = readFileSync(pfad, 'utf8');
		expect(quelltext).toContain('openQueueOrder');
	});

	it.each(QUELLEN)('%s baut keine eigene Sortierung auf created', (pfad) => {
		const quelltext = readFileSync(pfad, 'utf8');
		const eigenbau = /orderBy\(\s*(asc|desc)\(\s*sightings\.created/;

		expect(
			eigenbau.test(quelltext),
			`${pfad} sortiert selbst auf created. Nutze openQueueOrderBy(order) aus ` +
				'$lib/server/db/openQueueOrder — sonst laufen Eingangsliste und ' +
				'Warteschlange auseinander, und der Auto-Advance überspringt eine Meldung.'
		).toBe(false);
	});
});
