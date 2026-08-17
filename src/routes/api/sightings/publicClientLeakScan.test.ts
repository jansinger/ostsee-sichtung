import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectHits, sourceFiles, stripComments } from '$lib/testing/sourceScan.testutil';

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
 * (Spaltenauswahl, Response-Objekt), als Punktzugriff/Bracket-Zugriff auf ein
 * Objekt (`row.entryClient`, `row['entryClient']`), als Stringliteral (SQL,
 * Spaltenlisten) oder als Shorthand-Property/Destructuring am Rand eines
 * Objektliterals (`{ …, entryClient }` / `{ entryClient }`) — nicht als bloße
 * Variable in einer Zuweisung oder einem Funktionsargument. Beleg dafür steht
 * unten unter „Gegenproben — der echte Schreibpfad".
 *
 * **Fund aus dem Review (Critical 1).** Die ursprüngliche Fassung kannte nur
 * `\bentryClient\b\s*:` — einen Doppelpunkt HINTER dem Bezeichner. In den
 * gescannten Dateien heißt aber kein Antwortschlüssel `entryClient`: Sie
 * benutzen durchweg Kurzformen (`ts`, `dt`, `lat`, `ct`, …). Ein reales Leck
 * sähe deshalb so aus:
 *
 *   cl: sightings.entryClient,
 *
 * — der Doppelpunkt steht vor dem Alias, nicht hinter der Spalte. Das alte
 * Muster hätte das nicht gesehen. Der Punktzugriff (`\.\s*entryClient\b`)
 * schlägt hier an, ohne den Schreibpfad zu treffen: Dort steht vor
 * `entryClient` nie ein Punkt, nur `const `, `, ` oder `(`.
 *
 * **Bekannte Unschärfe.** Eine Shorthand-Property mitten in einem
 * Objektliteral (`{ entryClient, other }`) sieht textuell identisch aus wie
 * ein mittleres Funktionsargument (`foo(entryClient, other)`) — beides ist
 * `, entryClient,`. Ohne echten Parser lässt sich das nicht sauber trennen;
 * das Muster hier erkennt deshalb nur die shorthand-Form am Rand eines
 * Objekts (unmittelbar vor `}`, wie im Beispiel unten) zuverlässig. Derselbe
 * Kompromiss steht bereits in `sourceScan.testutil.ts` für `stripComments()`
 * dokumentiert.
 *
 * **Was dieser Guard NICHT sieht (Review, Runde 2).** Ein Guard über
 * Quelltext-Muster ist nie lückenlos. Bekannt und bewusst nicht geschlossen:
 *
 *  1. **Antwortaufbau in einer Datei außerhalb der gescannten Liste.** Der
 *     Critical-Fund aus Runde 2 war genau das: `api/map/sightings/+server.ts`
 *     selektiert nur Spalten, die eigentliche Antwort baut
 *     `sightingsToGeoJSON()` in `src/lib/map/mapUtils.ts` — eine Datei, die
 *     weder in `PUBLIC_ROUTES` noch im `src/routes`-Baum steht. Sie ist
 *     seither zusätzlich als eigener Eintrag aufgenommen (siehe
 *     `MAP_RESPONSE_BUILDERS` unten), aber das Prinzip bleibt: **jeder**
 *     Response-Builder, der aus `src/routes` heraus aufgerufen wird, muss von
 *     Hand in die Scan-Liste, der Selbsttest unten prüft nur `src/routes`
 *     selbst.
 *  2. **Indirektion über das Repository.** `getSightingById` und
 *     `getSightingByReferenceId` in `sightingRepository.ts` nutzen
 *     `db.select()` ohne Argument und laden damit `entryClient` mit — heute
 *     folgenlos, weil beide Aufrufer admin-gated sind. Bewusst NICHT in
 *     diese Scan-Liste aufgenommen: Die Datei setzt `entryClient` an anderer
 *     Stelle völlig legitim (Schreibpfad), ein Guard träfe dort sofort ein
 *     Falsch-Positiv. Dokumentiert stattdessen im Dateikopf von
 *     `sightingRepository.ts`.
 *  3. **Namespace-Import.** `importsSightingsFromSchema()` (siehe „Bestand"
 *     unten) erkennt `import * as schema from '.../schema'` nur, wenn
 *     `schema.sightings` textuell im selben File auftaucht. Ein Re-Export des
 *     Alias, ein Bracket-Zugriff (`schema['sightings']`) oder ein
 *     dynamisches `import()` entkommen weiterhin.
 *  4. **Ganze Zeile ohne Feldnamen jenseits von `.select()`/`.returning()`.**
 *     `{ ...row }`, `Object.assign({}, row)` oder `JSON.stringify(row)` ohne
 *     das Wort `entryClient` im selben Ausdruck erzeugen keinen Treffer —
 *     `WIDE_SELECT_PATTERNS` kennt nur die leeren Klammern von
 *     `.select()`/`.returning()`.
 *  5. **Spaltenauswahl über `getTableColumns()` oder die relationale
 *     Drizzle-API.** `select({ ...getTableColumns(sightings) })` liefert
 *     ebenso alle Spalten wie ein leeres `.select()`, ist textuell aber
 *     nicht `.select()` — genauso `db.query.sightings.findFirst()` /
 *     `.findMany()` ohne `columns`-Option. Keines der beiden Muster ist
 *     heute im Bestand, keines wird erkannt.
 *
 * Ein Guard muss die realistischen Fälle fangen und dort, wo er es nicht
 * kann, es benennen — nicht eine Deckung behaupten, die es nicht gibt.
 */

const REMEDIATION = [
	'`entryClient` (Spalte `eingangs_client`) ist eine interne Diagnosegröße.',
	'Sie gehört nicht in eine öffentliche Antwort — weder in die Spaltenauswahl',
	'noch in ein Mapping. Für den Admin liest sie AdminSightingView direkt.'
].join('\n');

/**
 * Zweite, eigenständige Regel derselben Datei (Critical 2): Eine Zeile ohne
 * Feldnamen entkommt jedem Muster oben, weil `entryClient` im Quelltext gar
 * nicht vorkommt:
 *
 *   const rows = await db.select().from(sightings);  return json(rows);
 *   const [row] = await db.insert(sightings).values(v).returning();
 *
 * `db.select()` ohne Argument steht im Repo an mehreren Stellen (siehe
 * `src/routes/admin/sichtungen/listColumns.ts`, dessen Datei-Doc genau davor
 * warnt: „ein zurückgedrehtes db.select() ohne Argument fällt sonst erst beim
 * Nutzer auf"). Geprüft wurde vor dieser Ergänzung, ob eine der fünf
 * geschützten Dateien das heute legitim tut — keine tut es: Alle Selects dort
 * benennen ihre Spalten explizit (siehe `Bestand` unten, „öffentliche Routen
 * wählen ihre Spalten explizit").
 */
const REMEDIATION_WIDE_SELECT = [
	'Eine öffentliche Route wählt ihre Spalten immer explizit aus — nie die',
	'ganze Zeile. `db.select()`/`.returning()` ohne Argument liefern alle',
	'Spalten, auch `entryClient`, und entkommen damit jedem Muster, das nach',
	'dem Feldnamen sucht. Stattdessen:',
	'  db.select({ id: sightings.id, … }).from(sightings)',
	'  db.insert(sightings).values(v).returning({ id: sightings.id })'
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
 *
 * Ob diese Liste **vollständig** ist — also ob es noch eine sechste
 * ungeschützte, lesende Route gibt —, prüft nicht diese Liste selbst, sondern
 * der Vollständigkeits-Selbsttest unten in „Bestand" (Important 3).
 */
const PUBLIC_ROUTES = [
	'src/routes/api/sightings/+server.ts',
	'src/routes/sichtungen/showreports.json/+server.ts',
	'src/routes/rest_sichtungen/antworten.json/+server.ts',
	'src/routes/api/map/sightings/+server.ts',
	'src/routes/api/map/sightings/years/+server.ts'
];

/**
 * Response-Builder, die keine Route sind, aber die öffentliche Antwort einer
 * `PUBLIC_ROUTES`-Route zusammensetzen (Critical-Fund, Runde 2).
 *
 * `api/map/sightings/+server.ts` selektiert nur Spalten; den eigentlichen
 * Antwort-Body baut `sightingsToGeoJSON()` in `mapUtils.ts`, Alias-Form
 * inklusive (`ct: dbSighting.totalCount, …` — exakt die Form, gegen die
 * Critical 1 oben antritt). Diese Datei liegt außerhalb von `src/routes` und
 * wird deshalb von keinem Scan hier automatisch gefunden — der
 * Vollständigkeits-Selbsttest unten in „Bestand" sieht nur `src/routes`.
 * Der einzige Schutz ist dieser von Hand gepflegte Eintrag.
 *
 * `readFileSync` braucht keinen Routen-Pfad — jede Datei, die eine
 * öffentliche Antwort baut, gehört hierher, unabhängig davon, ob sie unter
 * `src/routes` liegt.
 */
const MAP_RESPONSE_BUILDERS = ['src/lib/map/mapUtils.ts'];

/** Alle Dateien, die auf `entryClient`/weite Selects gescannt werden. */
const SCANNED_RESPONSE_FILES = [...PUBLIC_ROUTES, ...MAP_RESPONSE_BUILDERS];

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
 * 4. Punktzugriff auf ein Objekt: `row.entryClient`, `sightings.entryClient`.
 *    Das ist die Form aus dem Critical-1-Fund — der reale Leckpfad in diesem
 *    Bestand, weil hier die Spalte immer über einen Alias läuft
 *    (`cl: sightings.entryClient`) und nie unter ihrem eigenen Namen als
 *    Objektschlüssel steht.
 * 5. Bracket-Zugriff: `row['entryClient']`.
 * 6. Stringliteral: `'entryClient'` — z. B. in einer ausgelagerten
 *    Spaltenliste oder einem `pick()`/`omit()`-Aufruf. Deckt Nummer 5 zwar
 *    mit ab, steht aber als eigenes Muster mit eigenem konstruierten Beispiel,
 *    weil der Bracket-Zugriff der konkretere und wahrscheinlichere Fall ist
 *    (Vorbild: `verifiedReadScan.test.ts` nennt ihn als eine von drei Lücken
 *    seiner ersten Fassung).
 */
const DOT_ACCESS = /\.\s*entryClient\b/g;
const BRACKET_ACCESS = /\[\s*(['"`])entryClient\1\s*\]/g;
const STRING_LITERAL = /(['"`])entryClient\1/g;

const PATTERNS = [
	/\bentryClient\b\s*:/g,
	/\beingangs_client\b/g,
	/[{,]\s*\bentryClient\b\s*\}/g,
	DOT_ACCESS,
	BRACKET_ACCESS,
	STRING_LITERAL
];

/** Argumentloses `.select()`/`.returning()` — Critical 2, eigenes Muster und eigene Meldung. */
const WIDE_SELECT_PATTERNS = [/\.select\(\s*\)/g, /\.returning\(\s*\)/g];

describe('Öffentliche Antworten geben die Client-Kennung nicht aus', () => {
	it.each(SCANNED_RESPONSE_FILES)('%s nennt entryClient nicht', (datei) => {
		const hits = collectHits(stripComments(readFileSync(datei, 'utf8')), PATTERNS);

		expect(hits, `${datei}:\n${REMEDIATION}`).toEqual([]);
	});

	it.each(SCANNED_RESPONSE_FILES)('%s liest keine ganze Zeile ohne Spaltenauswahl', (datei) => {
		const hits = collectHits(stripComments(readFileSync(datei, 'utf8')), WIDE_SELECT_PATTERNS);

		expect(hits, `${datei}:\n${REMEDIATION_WIDE_SELECT}`).toEqual([]);
	});

	describe('Mustererkennung — jede Schreibweise muss anschlagen', () => {
		it.each([
			['Spaltenauswahl', 'select({ id: sightings.id, entryClient: sightings.entryClient })'],
			['Shorthand-Property am Rand des Objekts', 'return { ...row, entryClient }'],
			['Destructuring am Rand des Objekts', 'const { id, entryClient } = row;'],
			['roher Spaltenname in SQL', 'sql`SELECT eingangs_client FROM sichtungen`'],
			['roher Spaltenname als Stringliteral', "const column = 'eingangs_client';"],
			// Critical 1: der reale Leckpfad — Punktzugriff über einen Alias.
			['Punktzugriff über Alias (Critical-1-Fund)', 'cl: sightings.entryClient,'],
			['Punktzugriff auf eine geladene Zeile', 'return json({ cl: row.entryClient });'],
			// Important 1: Bracket-Zugriff und Stringliteral.
			['Bracket-Zugriff', "const cl = row['entryClient'];"],
			['Stringliteral in einer Spaltenliste', "const publicFields = ['id', 'entryClient'];"]
		])('%s', (_fall, code) => {
			expect(collectHits(stripComments(code), PATTERNS)).not.toEqual([]);
		});

		it.each([
			['db.select() ohne Argument', 'const rows = await db.select().from(sightings);'],
			[
				'db.select() ohne Argument, mit anschließendem Rückgabewert',
				'const rows = await db.select().from(sightings); return json(rows);'
			],
			[
				'.returning() ohne Argument',
				'const [row] = await db.insert(sightings).values(v).returning();'
			],
			[
				'.returning() ohne Argument nach mehreren Zeilen',
				'const rows = await db.update(sightings).set(v).where(cond).returning();'
			]
		])('%s (Critical 2)', (_fall, code) => {
			expect(collectHits(stripComments(code), WIDE_SELECT_PATTERNS)).not.toEqual([]);
		});
	});

	describe('Gegenproben — das darf NICHT anschlagen', () => {
		it.each([
			['Kommentar mit Begründung', '// entryClient bleibt intern'],
			// Important 4: echte Trennschärfe-Gegenprobe. `entryClientLabel` ist
			// kein `entryClient` — an keinem Muster oben, weder Wortgrenze noch
			// Anführungszeichen noch Punktzugriff.
			['ähnlicher, anderer Bezeichner', 'const entryClientLabel = 1;'],
			['ähnlicher Bezeichner als Objektschlüssel', 'return { entryClientLabel: 1 };'],
			['ähnlicher Bezeichner als Stringliteral', "const x = 'entryClientLabel';"]
		])('%s', (_fall, code) => {
			expect(collectHits(stripComments(code), PATTERNS)).toEqual([]);
		});

		it.each([
			['explizite Spaltenauswahl', 'db.select({ id: sightings.id }).from(sightings)'],
			[
				'explizites .returning() mit Spaltenliste',
				'await tx.delete(sightingFiles).where(cond).returning({ filePath: sightingFiles.filePath });'
			]
		])('%s (Critical 2)', (_fall, code) => {
			expect(collectHits(stripComments(code), WIDE_SELECT_PATTERNS)).toEqual([]);
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
			// Minor-Fund: Ein Filter auf `\bentryClient\b` behauptet bei einem
			// echten Leck fälschlich „das Muster ist wieder zu weit geworden" —
			// das Wort steht auch im legitimen Schreibpfad. Eingegrenzt auf die
			// beiden Funktionsnamen, die den Schreibpfad tatsächlich ausmachen,
			// bleibt die Diagnose richtig: Bricht dieser Test, ist entweder einer
			// dieser Aufrufe verschwunden (Selbsttest unten), oder eine NEUE Zeile
			// mit `resolveEntryClient`/`saveSighting` enthält einen echten Treffer.
			const writePathLines = stripComments(source)
				.split('\n')
				.filter((line) => /resolveEntryClient|saveSighting/.test(line));

			// Selbsttest: Es MUSS Schreibpfad-Zeilen geben, sonst prüft dieser
			// Test nichts (die Datei hätte den Bezeichner entfernt).
			expect(writePathLines.length).toBeGreaterThan(0);

			for (const line of writePathLines) {
				expect(collectHits(line, PATTERNS)).toEqual([]);
			}
		});
	});
});

/**
 * Vollständigkeits-Selbsttest (Important 3).
 *
 * `PUBLIC_ROUTES` oben ist eine von Hand gepflegte Liste — fünf Pfade, die
 * jemand als „die öffentlichen, lesenden Routen" erkannt hat. Eine neue Route,
 * die aus `sightings` liest und ohne Anmeldung erreichbar ist, wäre ab Tag
 * eins ungeschützt, ohne dass etwas rot wird — genau die falsche Polarität,
 * die die beiden Vorbilder (`verifiedReadScan.test.ts`,
 * `approvalPredicateScan.test.ts`) vermeiden, indem sie über `sourceFiles(...)`
 * den ganzen Baum einlesen und eine ALLOWED-Liste pflegen statt einer
 * geschützten Liste.
 *
 * Diese Gruppe dreht die Polarität um: Sie findet **jede** `.ts`-Datei unter
 * `src/routes`, die `sightings` aus dem Schema importiert (also potenziell
 * eine Zeile der Tabelle lesen kann), und verlangt für jede von ihnen einen
 * von drei Nachweisen:
 *
 *  1. Sie steht in `PUBLIC_ROUTES` — oben durch die Mustererkennung geschützt.
 *  2. Sie liegt unter `src/routes/admin/` — der Auth-Guard sitzt zentral in
 *     `admin/+layout.server.ts` (`.claude/rules/admin.md`, „Auth Pattern"),
 *     einzelne Routen prüfen bewusst nicht noch einmal.
 *  3. Sie ruft `requireUserRole(...)` selbst auf (Routen außerhalb `admin/`,
 *     die trotzdem admin-geschützt sind, z. B. `/api/sightings/[id]`) — oder
 *     sie steht mit Begründung in `ALLOWED_UNPROTECTED` (Helfer, die selbst
 *     keinen Header senden, oder öffentliche Routen, die nachweislich nur
 *     aggregierte bzw. bereits freigegebene Felder ausgeben).
 *
 * Was das nicht ersetzt: Ein Eintrag in `ALLOWED_UNPROTECTED` behauptet nur
 * „diese Datei ist kein Leckpfad", er scannt sie nicht auf `entryClient`. Wer
 * eine Datei dort einträgt, die doch Zeilenfelder ausgibt, muss das selbst
 * begründen — der Selbsttest erzwingt nur, dass niemand eine neue Route
 * lautlos an allen drei Nachweisen vorbeischreibt.
 */
describe('Bestand — jede lesende Route ist erfasst oder begründet ausgenommen', () => {
	const ADMIN_PREFIX = 'src/routes/admin/';

	/**
	 * Jede Schreibweise des Schema-Modulpfads, die im Bestand vorkommt oder
	 * vorkommen könnte: `$lib`-Alias oder relativer Pfad, mit oder ohne
	 * `.js`-Endung, ein- oder doppelte Anführungszeichen. Nur `schema`
	 * (lowercase) am Pfadende — `sightingSchema` (Yup, camelCase) trifft
	 * dieses Muster nicht, siehe Gegenprobe unten.
	 */
	const SCHEMA_MODULE_PATH = String.raw`(?:'|")(?:\$lib\/server\/db\/schema(?:\.js)?|\.\.?\/[\w./-]*schema(?:\.js)?)(?:'|")`;

	/**
	 * Erkennt den benannten Schema-Import über den Namen, nicht über eine
	 * Import-Zeile mit fester Reihenfolge — `import { sightings, type X }
	 * from …` und `import type { sightings } from …` müssen beide treffen.
	 * `[^}]*` frisst dabei auch Zeilenumbrüche (kein `.`, keine `s`-Flag nötig).
	 */
	const NAMED_SCHEMA_IMPORT = new RegExp(
		String.raw`import\s+(?:type\s+)?\{[^}]*\bsightings\b[^}]*\}\s*from\s*` + SCHEMA_MODULE_PATH
	);

	/**
	 * Namespace-Import (`import * as schema from '.../schema'`) — im Repo
	 * bereits benutzt (`src/tools/generate-reference-ids.ts`,
	 * `src/tools/migrate-old-uploads.ts`). Die Import-Zeile selbst nennt
	 * `sightings` nicht; erst eine Fundstelle wie `schema.sightings`
	 * anderswo in der Datei macht sie zu einer lesenden Route. Erkennt daher
	 * nur den lokalen Alias-Namen, die eigentliche Prüfung erfolgt in
	 * {@link importsSightingsFromSchema}. Bekannte Lücke: ein Re-Export des
	 * Alias oder `schema['sightings']` entkommen weiterhin — siehe Dateikopf,
	 * „Was dieser Guard NICHT sieht", Punkt 3.
	 */
	const NAMESPACE_SCHEMA_IMPORT = new RegExp(
		String.raw`import\s+\*\s+as\s+(\w+)\s+from\s*` + SCHEMA_MODULE_PATH
	);

	function importsSightingsFromSchema(source: string): boolean {
		if (NAMED_SCHEMA_IMPORT.test(source)) return true;

		const namespaceMatch = source.match(NAMESPACE_SCHEMA_IMPORT);
		if (!namespaceMatch) return false;

		const alias = namespaceMatch[1];
		return new RegExp(`\\b${alias}\\.sightings\\b`).test(source);
	}

	function sightingReadingRouteFiles(): string[] {
		return sourceFiles('src/routes', /\.ts$/)
			.filter((path) => !path.endsWith('.test.ts'))
			.filter((path) => importsSightingsFromSchema(readFileSync(path, 'utf8')));
	}

	/**
	 * Mustererkennung für `importsSightingsFromSchema` (Important 2, Review
	 * Runde 2). Jede dieser Formen fiel vor der Erweiterung durch das alte,
	 * einzeilige `SCHEMA_IMPORT`-Muster (feste `$lib`-Alias-Form, einfache
	 * Anführungszeichen, kein Namespace-Import).
	 */
	describe('importsSightingsFromSchema — jede Schreibweise muss anschlagen', () => {
		it.each([
			[
				'$lib-Alias, einfache Anführungszeichen (Bestand)',
				"import { sightings } from '$lib/server/db/schema';"
			],
			['doppelte Anführungszeichen', 'import { sightings } from "$lib/server/db/schema";'],
			['.js-Endung', "import { sightings } from '$lib/server/db/schema.js';"],
			['relativer Pfad', "import { sightings } from '../db/schema';"],
			[
				'relativer Pfad mit .js-Endung',
				"import { type SightingSelect, sightings } from '../../server/db/schema.js';"
			],
			[
				'Namespace-Import mit Punktzugriff (Bestand: generate-reference-ids.ts, migrate-old-uploads.ts)',
				"import * as schema from '$lib/server/db/schema';\nconst rows = await db.select().from(schema.sightings);"
			]
		])('%s', (_fall, code) => {
			expect(importsSightingsFromSchema(code)).toBe(true);
		});

		it.each([
			[
				'Namespace-Import ohne Verwendung von .sightings',
				"import * as schema from '$lib/server/db/schema';\nconst rows = await db.select().from(schema.sightingFiles);"
			],
			[
				'ähnlicher, anderer Import (Yup-Schema, camelCase)',
				"import { sightingSchema } from '$lib/form/validation/sightingSchema';"
			],
			[
				'Import ohne sightings im selben Schlüsselwortblock',
				"import { sightingFiles } from '$lib/server/db/schema';"
			]
		])('%s (darf NICHT anschlagen)', (_fall, code) => {
			expect(importsSightingsFromSchema(code)).toBe(false);
		});
	});

	/**
	 * Dateien außerhalb von `admin/`, die aus `sightings` lesen können, ohne
	 * selbst `requireUserRole(...)` aufzurufen — je mit Begründung, warum sie
	 * trotzdem kein Leckpfad für `entryClient` sind.
	 */
	const ALLOWED_UNPROTECTED: ReadonlyMap<string, string> = new Map([
		[
			'src/routes/about/+page.server.ts',
			'Öffentlich, aber liest nur COUNT()/MIN()-Aggregate (Gesamtzahl, Melderzahl, frühestes Jahr) — nie eine Zeile, nie eine Spalte namens entryClient.'
		],
		[
			'src/routes/api/media/[...path]/+server.ts',
			'Öffentlich erreichbar für freigegebene Medien (docs/DESIGN_GUIDE.md, Privacy-Review), selektiert für die Freigabeprüfung aber ausschließlich approvedAt — nie die ganze Zeile, nie entryClient.'
		],
		[
			'src/routes/uploads/[...path]/+server.ts',
			'Gleiche Konstruktion wie api/media: öffentlich, selektiert nur approvedAt für den Freigabe-Check.'
		],
		[
			'src/routes/api/map/sightings/publicMapConditions.ts',
			'Baut nur WHERE-Bedingungen (mapSightingConditions) für die beiden PUBLIC_ROUTES-Karten-Endpunkte — liest keine Zeile und gibt keine Antwort zurück, kann die Spalte also nicht ausliefern.'
		],
		[
			'src/routes/api/sightings/export/toFrontendSighting.ts',
			'Reiner Zeilen-Mapper für den Export, aufgerufen ausschließlich von den fünf Export-Routen unter api/sightings/export/**, die alle requireUserRole(admin) aufrufen. Der Typ-Import von sightings dient nur InferSelectModel, es gibt keinen HTTP-Handler in dieser Datei.'
		],
		[
			'src/routes/api/sightings/export/exportFilterParams.ts',
			'Baut nur WHERE-Bedingungen für den Export-Filter, aufgerufen ausschließlich von den admin-geschützten Export-Routen (requireUserRole). Kein HTTP-Handler, keine Zeilenauswahl, keine Antwort.'
		]
	]);

	function isCovered(path: string): boolean {
		if (PUBLIC_ROUTES.includes(path)) return true;
		if (path.startsWith(ADMIN_PREFIX)) return true;
		if (ALLOWED_UNPROTECTED.has(path)) return true;
		// stripComments: sonst zählt ein requireUserRole(...) in einem
		// Kommentar (z. B. einer Begründung, warum eine Route KEINEN Guard
		// braucht) fälschlich als Schutz (Minor-Fund, Review Runde 2).
		return /requireUserRole\(/.test(stripComments(readFileSync(path, 'utf8')));
	}

	it('jede lesende Route ist geschützt, admin-gesperrt oder ausdrücklich ausgenommen', () => {
		const offenders = sightingReadingRouteFiles().filter((path) => !isCovered(path));

		expect(
			offenders,
			`Neue Route liest aus sightings, ohne durch PUBLIC_ROUTES, admin/-Layout,\n` +
				`requireUserRole(...) oder ALLOWED_UNPROTECTED gedeckt zu sein:\n\n` +
				offenders.join('\n')
		).toEqual([]);
	});

	/* Zwei Selbsttests. Ein Scan, der nichts liest oder nichts erkennt, ist grün
	   und beweist nichts — das ist die Sorte Deckung, die keine ist. */
	it('findet überhaupt lesende Routen', () => {
		expect(sightingReadingRouteFiles().length).toBeGreaterThan(10);
	});

	/**
	 * `antworten.json/+server.ts` fehlt hier bewusst: Es liefert eine statische
	 * Dropdown-Optionsliste aus Enum-Labeln und importiert `sightings` nirgends
	 * — der Schema-Import-Scan findet es also korrekt nicht. Es bleibt trotzdem
	 * in `PUBLIC_ROUTES` (Verteidigung in der Tiefe, falls die Route später
	 * einmal Zeilenfelder ausliefert), nur eben ohne diesen Nachweis.
	 */
	it('findet die vier Sichtungszeilen lesenden PUBLIC_ROUTES wieder — sonst schützt die Liste die falschen Pfade', () => {
		const found = sightingReadingRouteFiles();
		const readsTable = PUBLIC_ROUTES.filter(
			(route) => route !== 'src/routes/rest_sichtungen/antworten.json/+server.ts'
		);

		expect(readsTable.length).toBeGreaterThan(0);
		for (const route of readsTable) {
			expect(found, `${route} taucht im Scan nicht auf — Pfad falsch geschrieben?`).toContain(
				route
			);
		}
	});

	it('nennt für jede Ausnahme eine Begründung — und jede Ausnahme wird gebraucht', () => {
		const found = sightingReadingRouteFiles();

		for (const [path, reason] of ALLOWED_UNPROTECTED) {
			expect(
				found,
				`Ausnahme zeigt auf eine Datei, die den Schema-Import nicht (mehr) hat: ${path}`
			).toContain(path);
			expect(reason.length, `Ausnahme ohne Begründung: ${path}`).toBeGreaterThan(40);
			expect(
				// stripComments: siehe Begründung in isCovered() oben.
				stripComments(readFileSync(path, 'utf8')).includes('requireUserRole('),
				`${path} ruft requireUserRole(...) auf — gehört nicht mehr in ALLOWED_UNPROTECTED, der dynamische Nachweis greift bereits.`
			).toBe(false);
		}
	});
});
