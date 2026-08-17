import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectHits, stripComments } from '$lib/testing/sourceScan.testutil';

/**
 * @fileoverview `entryClient` darf in keiner öffentlichen Antwort auftauchen.
 *
 * Das Feld ist eine interne Diagnosegröße (Spalte `eingangs_client`). Einmal
 * ausgegeben, wäre es Teil eines öffentlichen Vertrags, aus dem es nicht mehr
 * herauskommt — die Legacy-Clients (`.claude/rules/legacy-api.md`) zeigen, wie
 * lange ein einmal gelieferter Feldname bindet.
 *
 * Kommentare sind ausgenommen, sonst verbietet die Regel ihre eigene
 * Begründung (deshalb `stripComments`, dieselbe Aufbereitung wie in
 * `verifiedReadScan.test.ts`).
 *
 * **Warum die Muster nicht einfach `\bentryClient\b` sind.** Der naheliegende
 * Entwurf — ein nacktes Wortgrenzen-Muster über die ganze Datei — schlägt am
 * eigenen Bestand fehl: `src/routes/api/sightings/+server.ts` ist zugleich die
 * öffentliche Sichtungsliste (`GET`, ungeschützt) UND der moderne
 * Schreibpfad (`POST`), der `entryClient` legitim berechnet und an
 * `saveSighting()` übergibt — nachweislich:
 *
 *   const entryClient = resolveEntryClient({ ... });
 *   const { id } = await saveSighting(formDataWithDefaults, weatherData, spamCheck, entryClient);
 *
 * Ein Datei-weites `\bentryClient\b` träfe diese beiden Zeilen und wäre vom
 * ersten Lauf an rot — nicht wegen eines Lecks, sondern wegen des Schreibpfads
 * im selben Modul. Die Muster hier sind deshalb an die Form gebunden, in der
 * ein Wert tatsächlich in eine JSON-Antwort geraten kann: als Objektschlüssel
 * (Spaltenauswahl, Response-Objekt) oder als Shorthand-Property/Destructuring
 * am Rand eines Objektliterals (`{ …, entryClient }` / `{ entryClient }`) —
 * nicht als bloße Variable in einer Zuweisung oder einem Funktionsargument.
 * Beleg dafür steht unten unter „Gegenproben — der echte Schreibpfad".
 *
 * **Bekannte Unschärfe.** Eine Shorthand-Property mitten in einem
 * Objektliteral (`{ entryClient, other }`) sieht textuell identisch aus wie
 * ein mittleres Funktionsargument (`foo(entryClient, other)`) — beides ist
 * `, entryClient,`. Ohne echten Parser lässt sich das nicht sauber trennen;
 * das Muster hier erkennt deshalb nur die shorthand-Form am Rand eines
 * Objekts (unmittelbar vor `}`, wie im Beispiel unten) zuverlässig. Derselbe
 * Kompromiss steht bereits in `sourceScan.testutil.ts` für `stripComments()`
 * dokumentiert.
 */

const REMEDIATION = [
	'`entryClient` (Spalte `eingangs_client`) ist eine interne Diagnosegröße.',
	'Sie gehört nicht in eine öffentliche Antwort — weder in die Spaltenauswahl',
	'noch in ein Mapping. Für den Admin liest sie AdminSightingView direkt.'
].join('\n');

/**
 * Öffentliche Antwortbauer — keine Admin-Route, keine Testdatei.
 *
 * Alle fünf sind ohne Anmeldung erreichbar und lesen `sightings`-Zeilen für
 * ihre Antwort:
 *  - `api/sightings/+server.ts` — moderne Sichtungsliste (`GET`, öffentliche
 *    Grundmenge über `approvedOnly()`; enthält zugleich den `POST`-Schreibpfad).
 *  - `sichtungen/showreports.json/+server.ts` — Legacy-Antwort; hat einen
 *    Admin-Zweig (breitere Suche), bleibt aber ohne Anmeldung erreichbar.
 *  - `rest_sichtungen/antworten.json/+server.ts` — Legacy-Optionsliste.
 *  - `api/map/sightings/+server.ts` und `.../years/+server.ts` — Kartendaten;
 *    laut `.claude/rules/api.md` ohne `status`-Parameter identisch mit der
 *    öffentlichen Grundmenge, der Parameter selbst verlangt eine Admin-Session.
 *
 * Ausdrücklich NICHT dabei: `rest_sichtungen/+server.ts` (reiner Schreibpfad,
 * die Antwort ist ein fixes `{ message: 'Saved' }`, keine Zeilenfelder) und
 * `rest_sichtungen/inBaltic.json/+server.ts` (prüft nur eine Koordinate,
 * berührt die `sightings`-Tabelle nicht). Beide bauen keine Antwort aus einer
 * Sichtungszeile und sind damit kein Leckpfad für dieses Feld.
 */
const PUBLIC_ROUTES = [
	'src/routes/api/sightings/+server.ts',
	'src/routes/sichtungen/showreports.json/+server.ts',
	'src/routes/rest_sichtungen/antworten.json/+server.ts',
	'src/routes/api/map/sightings/+server.ts',
	'src/routes/api/map/sightings/years/+server.ts'
];

/**
 * Jede Schreibweise, mit der das Feld in eine Antwort geraten kann.
 *
 * 1. Objektschlüssel — Spaltenauswahl oder Response-Mapping:
 *    `entryClient: sightings.entryClient` / `entryClient: value`.
 * 2. Der rohe Spaltenname — SQL-Template oder Stringliteral.
 * 3. Shorthand-Property/Destructuring am Rand eines Objektliterals:
 *    `{ ...row, entryClient }`, `{ entryClient }`, `const { entryClient } = row;`.
 *    Erkannt an `{`/`,` davor und `}` danach — das schließt Zuweisungen
 *    (`= resolveEntryClient(`) und Funktionsargumente (`, entryClient);`) aus,
 *    weil dort kein `}` unmittelbar folgt.
 */
const PATTERNS = [/\bentryClient\b\s*:/g, /\beingangs_client\b/g, /[{,]\s*\bentryClient\b\s*\}/g];

describe('Öffentliche Antworten geben die Client-Kennung nicht aus', () => {
	it.each(PUBLIC_ROUTES)('%s nennt entryClient nicht', (datei) => {
		const hits = collectHits(stripComments(readFileSync(datei, 'utf8')), PATTERNS);

		expect(hits, `${datei}:\n${REMEDIATION}`).toEqual([]);
	});

	describe('Mustererkennung — jede Schreibweise muss anschlagen', () => {
		it.each([
			['Spaltenauswahl', 'select({ id: sightings.id, entryClient: sightings.entryClient })'],
			['Shorthand-Property am Rand des Objekts', 'return { ...row, entryClient }'],
			['Destructuring am Rand des Objekts', 'const { id, entryClient } = row;'],
			['roher Spaltenname in SQL', 'sql`SELECT eingangs_client FROM sichtungen`'],
			['roher Spaltenname als Stringliteral', "const column = 'eingangs_client';"]
		])('%s', (_fall, code) => {
			expect(collectHits(stripComments(code), PATTERNS)).not.toEqual([]);
		});
	});

	describe('Gegenproben — das darf NICHT anschlagen', () => {
		it.each([
			['Kommentar mit Begründung', '// entryClient bleibt intern'],
			['ähnlicher, anderer Bezeichner', 'const entryClientLabel = 1;']
		])('%s', (_fall, code) => {
			expect(collectHits(stripComments(code), PATTERNS)).toEqual([]);
		});
	});

	/**
	 * Der echte Schreibpfad aus `api/sightings/+server.ts` — wörtlich, nicht
	 * nachgebaut. Diese Gruppe belegt, warum die Muster oben so eng gefasst
	 * sind: Ein naives `\bentryClient\b` würde genau hier zünden, obwohl der
	 * Wert nie in die Antwort gelangt (`saveSighting()` schreibt nur in die
	 * DB). Bricht dieser Test, hat sich entweder der Schreibpfad geändert oder
	 * das Muster ist wieder zu weit geworden.
	 */
	describe('Gegenproben — der echte Schreibpfad', () => {
		it.each([
			[
				'Zuweisung aus resolveEntryClient',
				"const entryClient = resolveEntryClient({ source: 'web', appVersion });"
			],
			[
				'Übergabe als Funktionsargument an saveSighting',
				'const { id } = await saveSighting(formDataWithDefaults, weatherData, spamCheck, entryClient);'
			]
		])('%s', (_fall, code) => {
			expect(collectHits(stripComments(code), PATTERNS)).toEqual([]);
		});

		it('der tatsächliche Schreibpfad in api/sightings/+server.ts bleibt unauffällig', () => {
			const source = readFileSync('src/routes/api/sightings/+server.ts', 'utf8');
			const writePathLines = stripComments(source)
				.split('\n')
				.filter((line) => /\bentryClient\b/.test(line));

			// Selbsttest: Es MUSS Schreibpfad-Zeilen geben, sonst prüft dieser
			// Test nichts (die Datei hätte den Bezeichner entfernt).
			expect(writePathLines.length).toBeGreaterThan(0);

			for (const line of writePathLines) {
				expect(collectHits(line, PATTERNS)).toEqual([]);
			}
		});
	});
});
