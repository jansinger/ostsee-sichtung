/**
 * @fileoverview Wächter: Eingangsliste und Queue-Endpunkt sortieren gleich.
 *
 * Die beiden Stellen müssen dieselbe Reihenfolge liefern, sonst überspringt der
 * Auto-Advance still eine Meldung. Ein Review bemerkt das nicht — die Zeilen
 * stehen in verschiedenen Dateien und sehen einzeln jeweils richtig aus.
 *
 * Der Test prüft deshalb **den Import**, nicht das Ergebnis: Wer künftig eine
 * eigene Sortierung auf `created` schreibt, fällt hier auf. Bewusst über den
 * Quelltext und nicht über einen Laufzeitvergleich — ein Vergleich zweier
 * kompilierter SQL-Strings wäre grün, solange beide zufällig gleich sind, und
 * würde die eigentliche Regel (eine Quelle) nicht ausdrücken.
 *
 * **Warum nicht `orderBy\(\s*(asc|desc)\(`.** Vor der Zentralisierung stand in
 * beiden Dateien `.orderBy(order === 'desc' ? desc(sightings.created) :
 * asc(sightings.created))` — die Ternär-Form steht nicht unmittelbar hinter
 * `orderBy(`. Ein Rückfall, der die Vorgängerzeile aus der Historie holt oder
 * den Refactor teilweise revertiert, liefe an einem `orderBy(`-Anker vorbei.
 * Das Muster unten lässt den Anker fallen und prüft `(asc|desc)(sightings.created`
 * irgendwo in der Datei — das deckt Ternär, Array-Form und die Zuweisung an eine
 * Zwischenvariable gleichermaßen ab.
 *
 * **Warum zusätzlich ein `sql`-Template-Muster.** `orderBy(sql\`…created
 * desc…\`)` ist im Projekt der idiomatische Stil für Sortierungen, nicht die
 * Ausnahme — so sortieren `admin/sichtungen/+page.server.ts`,
 * `admin/statistics/+page.server.ts`, `showreports.json/+server.ts` und
 * `api/map/sightings/years/+server.ts`. Wer die Eingangsliste neben ihrer
 * Schwesterroute anfasst, schreibt mit hoher Wahrscheinlichkeit genau diese
 * Form. Ohne dieses zweite Muster liefe der Guard an der wahrscheinlichsten
 * Fehlfassung vorbei.
 *
 * **Warum `stripComments`/`collectHits` statt eigenem Textverfahren.** Rohtext
 * hat zwei Schwächen: Ein Kommentar wie „früher: orderBy(desc(sightings.created))“
 * würde den Guard fälschlich rot färben, und eine bloße Kommentar-Erwähnung von
 * `openQueueOrder` hielte den Import-Test grün, obwohl der Import fehlt.
 * `$lib/testing/sourceScan.testutil` blendet Kommentare aus — dieselbe Begründung
 * wie in `approvalPredicateScan.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectHits, stripComments } from '$lib/testing/sourceScan.testutil';

/**
 * Die beiden Stellen, die dieselbe Ordnung teilen müssen — Pfad relativ zu
 * dieser Datei, damit die Auflösung unabhängig vom Arbeitsverzeichnis ist.
 */
const QUELLEN = [
	{ name: 'src/routes/admin/+page.server.ts', path: '../../../routes/admin/+page.server.ts' },
	{
		name: 'src/routes/api/sightings/[id]/queue/+server.ts',
		path: '../../../routes/api/sightings/[id]/queue/+server.ts'
	}
] as const;

/**
 * `(asc|desc)(sightings.created` irgendwo in der Datei — bewusst ohne
 * `orderBy(`-Anker. Deckt die Ternär-Form aus der Vorgeschichte, die Array-Form
 * (`[asc(sightings.created), asc(sightings.id)]`) und eine Zuweisung an eine
 * Zwischenvariable gleichermaßen ab.
 */
const EIGENE_SORTIERUNG = /\b(?:asc|desc)\(\s*sightings\.created\b/g;

/**
 * `sql\`…created… (asc|desc)…\`` — die im Projekt gelebte Sortier-Schreibweise.
 * Zwei Lookaheads statt einer festen Reihenfolge, weil `created` in den
 * bestehenden Belegen mal vor, mal (über eine Hilfsfunktion) nach dem
 * Richtungswort steht. Die Lookaheads selbst sind mit `[^\`]*` auf den
 * Template-Inhalt begrenzt — `[\s\S]*?` ignoriert innerhalb eines Lookaheads
 * die lazy-Begrenzung des konsumierenden Teils und läse bis zum Dateiende
 * weiter; ein beliebiges `sql\`…\`` ohne Generic, gefolgt (irgendwo in der
 * Datei) von `created` und `asc`/`desc`, wäre dann fälschlich ein Treffer.
 */
const SQL_TEMPLATE_SORTIERUNG = /sql`(?=[^`]*\bcreated\b)(?=[^`]*\b(?:asc|desc)\b)[^`]*`/gi;

const EIGENBAU_MUSTER = [EIGENE_SORTIERUNG, SQL_TEMPLATE_SORTIERUNG] as const;

/** Liest die Route und meldet einen verschobenen Pfad als solchen. */
function leseQuelle(name: string, path: string): string {
	const absolut = fileURLToPath(new URL(path, import.meta.url));
	try {
		return readFileSync(absolut, 'utf8');
	} catch {
		throw new Error(
			`Quelltext von ${name} nicht lesbar (${absolut}). Wurde die Route verschoben? ` +
				'Dann den Pfad in QUELLEN mitziehen — nicht den Eintrag entfernen.'
		);
	}
}

describe('Ordnung des offenen Stapels', () => {
	for (const { name, path } of QUELLEN) {
		describe(name, () => {
			const quelltext = leseQuelle(name, path);
			const bereinigt = stripComments(quelltext);

			it('importiert die gemeinsame Ordnung', () => {
				// Prüft den Importpfad, nicht nur den Bezeichner: Eine lokal
				// definierte Funktion namens `openQueueOrderBy` hielte
				// `toContain('openQueueOrder')` grün, ohne dass der Import
				// existiert.
				expect(bereinigt).toMatch(/from ['"]\$lib\/server\/db\/openQueueOrder['"]/);
			});

			it('baut keine eigene Sortierung auf created', () => {
				const treffer = collectHits(bereinigt, EIGENBAU_MUSTER);

				expect(
					treffer,
					`${name} sortiert selbst auf created. Nutze openQueueOrderBy(order) aus ` +
						'$lib/server/db/openQueueOrder — sonst laufen Eingangsliste und ' +
						'Warteschlange auseinander, und der Auto-Advance überspringt eine Meldung.\n\n' +
						treffer.map((hit) => `  Zeile ${hit.line}: ${hit.text}`).join('\n')
				).toEqual([]);
			});
		});
	}
});
