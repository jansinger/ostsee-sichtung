import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectHits, sourceFiles, stripComments } from '$lib/testing/sourceScan.testutil';
import type { SourceHit } from '$lib/testing/sourceScan.testutil';

/**
 * @fileoverview Hartcodierter Anzeigetext in Schicht A (Yup-Schema) und Schicht B
 * (Domänen-Label-Dateien) — der Rückfall, den Paraglide nicht melden kann.
 *
 * **Das Problem.** Paraglide meldet eine Botschaft, die extrahiert wurde und deren
 * englische Fassung fehlt — das ist ein Build-Fehler. Es kann prinzipbedingt
 * **nicht** melden, was nie ein Schlüssel wurde: Ein hartcodierter deutscher Text
 * fehlt in keiner Sprachdatei. Genau das ist der Zustand, in dem das englische
 * Formular deutsche Brocken zeigt, ohne dass irgendetwas rot wird.
 *
 * **Warum dieser Scan den Extraktor nicht benutzt.** Naheliegend wäre,
 * `collectSchemaSites` aus `src/tools/i18n-extract/` wiederzuverwenden — es
 * meldet für diese Dateien inzwischen 0 Funde, der Guard wäre eine Zeile. Aber
 * dann wäre er für genau das blind, wofür er gebaut wird: `.integer(message)`
 * war für den Extraktor unsichtbar und wäre es für einen darauf gestützten Scan
 * ebenso gewesen. Zwei **unabhängige** Mechanismen sind Redundanz; einer,
 * zweimal gezählt, ist keine. Der Scan arbeitet deshalb wie die vier
 * bestehenden Guards des Projekts (`approvalPredicateScan`, `verifiedReadScan`,
 * `statusLogWriteScan`, `openQueueOrderScan`) über
 * `src/lib/testing/sourceScan.testutil.ts` mit Mustern auf dem Quelltext.
 *
 * **Die Regel — bewusst ohne Sprachheuristik.** Ein Zeichenketten-Literal, das
 * Leerzeichen und mindestens zwei Buchstabengruppen enthält, ist in diesen
 * Dateien ein Befund. Eine Umlaut-Heuristik versagt genau dort, wo es zählt:
 * Eine versehentlich englisch hartcodierte Zeichenkette hat keine Umlaute. Die
 * Mehrwort-Regel trifft `'Bitte wählen Sie eine Tierart'` und
 * `'Please select a species'` gleichermaßen und lässt technische Tokens ohne
 * Leerzeichen durch (`'select'`, `'given-name'`, `'lucide:map-pin'`, `'sv-SE'`).
 *
 * **Umfang.** `sightingSchema.ts` und alle `formOptions/*.ts` außer
 * `speciesIdentification.ts` — siehe `EXEMPT_FILES` unten für die Begründung.
 * Admin-Bereich, Markup, `/docs` und `/styleguide` (Schicht C) sind bewusst
 * nicht dabei (Entwurf Abschnitt 7, `docs/i18n/PLAN_ETAPPE1_AUFGABE5_SCAN.md`):
 * Ein Guard, der ab Tag eins rot ist, wird abgeschaltet und schützt danach
 * nichts.
 *
 * Läuft im Node-Projekt (`npm run test:unit`, damit auch in `test:quick`).
 */

/** Was der Entwickler stattdessen tun soll — erscheint in jeder Fehlermeldung. */
const REMEDIATION = [
	'Hartcodierter Anzeigetext in Schicht A/B. Statt des Literals eine',
	'Paraglide-Botschaft benutzen: Schlüssel in messages/de.json UND',
	'messages/en.json anlegen (beide zunächst mit dem deutschen Wortlaut), dann',
	'm.<schlüssel>({}, { locale }) aufrufen. `npm run i18n:extract` zeigt',
	'Fundstelle und Schlüsselvorschlag. Danach germanBaseline.json prüfen — es',
	'muss unverändert bleiben.'
].join('\n');

/**
 * Ein Buchstabe, inklusive der im Formular vorkommenden Umlaute/Akzente
 * (Latin-1-Supplement-Block ohne `×`/`÷`). Absichtlich keine Umlaut-Heuristik
 * für die Entscheidung selbst — nur die Definition von „Buchstabe", damit
 * `wählen` als eine Gruppe zählt und nicht als drei.
 */
const LETTER = String.raw`[A-Za-zÀ-ÖØ-öø-ÿ]`;

/** Eine Buchstabengruppe: mindestens zwei Buchstaben am Stück. */
const GROUP = `${LETTER}{2,}`;

/**
 * Obergrenze für die Länge des Literal-Randes um die beiden Buchstabengruppen
 * herum (in Zeichen). Kein fachlicher Wert — reine Sicherheitsgrenze gegen
 * katastrophales Backtracking, siehe Begründung unten. Das längste Literal im
 * aktuellen Bestand aller 17 Dateien misst 218 Zeichen (in der ausgenommenen
 * `speciesIdentification.ts`); 300 lässt Luft, ohne die Begrenzung wirkungslos
 * zu machen.
 */
const MAX_LITERAL_EDGE = 300;

/**
 * Baut das Muster für eine Anführungszeichen-Art.
 *
 * Für `'`/`"` ist ein Zeilenumbruch innerhalb des Literals ausgeschlossen
 * (`[^quote\\\n]`) — ein echtes `'…'`/`"…"`-Literal kann ihn syntaktisch nicht
 * enthalten. Template-Literale (`` ` ``) dürfen dagegen echte Zeilenumbrüche
 * enthalten und bekommen den Ausschluss nicht.
 *
 * **Die Lücke zwischen den beiden Buchstabengruppen (`gap`) braucht denselben
 * Ausschluss wie der Rest des Literals** (Anführungszeichen, Backslash, bei
 * `'`/`"` auch Zeilenumbruch) — nicht nur „kein Buchstabe". Ohne ihn durfte
 * die Lücke selbst über das schließende Anführungszeichen hinweglesen.
 *
 * **Warum `{0,300}` und nicht `*`.** Die erste Fassung nutzte unbegrenztes
 * `*`/`*?` für den Rand vor und nach den beiden Buchstabengruppen. Für ein
 * Literal mit passendem Gegenstück ist das schnell — das Problem zeigt sich
 * erst, wenn ein Anführungszeichen **kein** Gegenstück im Rest der Datei hat
 * (`sightingSchema.ts` enthält genau ein Backtick-Paar; das zweite Backtick
 * dort ist aus Sicht dieses Musters ein Fall ohne Gegenstück). Dann muss der
 * Motor beweisen, dass **keine** Aufteilung der bis zu 48.000 Restzeichen auf
 * Rand/Gruppe/Lücke/Gruppe/Rand zu einem Treffer führt — mit fünf
 * unbegrenzten, einander überlappenden Quantoren (Rand und Gruppe teilen sich
 * dasselbe Buchstaben-Alphabet) ist das keine lineare Suche mehr, sondern
 * kombinatorisch: Gemessen ist der Lauf über die reale Datei bei 20.000
 * Zeichen bereits bei über 8 Sekunden und wächst überlinear weiter. Eine
 * feste Obergrenze pro Rand macht die Neuverteilung endlich (getestet:
 * derselbe Lauf über alle 17 Dateien in unter 10 ms) — echte Anzeigetexte
 * sind ohnehin kurz, ein Literal über 300 Zeichen ist im Bestand nicht zu
 * erwarten.
 *
 * Innerhalb des Literals wird **lazy** bis zur ersten Buchstabengruppe
 * vorgerückt (`*?`), dann muss eine leerzeichenhaltige Lücke und eine zweite
 * Buchstabengruppe folgen — danach beliebiger Rest bis zum schließenden
 * Anführungszeichen.
 */
function quotedLiteralWithTwoWords(quote: "'" | '"' | '`'): RegExp {
	const excludeNewline = quote === '`' ? '' : '\\n';
	const body = `[^${quote}\\\\${excludeNewline}]|\\\\.`;
	const gapChar = `[^A-Za-zÀ-ÖØ-öø-ÿ${quote}\\\\${excludeNewline}]`;
	const ws = quote === '`' ? '\\s' : '[ \\t]';
	const edgeLazy = `(?:${body}){0,${MAX_LITERAL_EDGE}}?`;
	const edgeGreedy = `(?:${body}){0,${MAX_LITERAL_EDGE}}`;
	const gap = `${gapChar}{0,${MAX_LITERAL_EDGE}}${ws}${gapChar}{0,${MAX_LITERAL_EDGE}}`;
	return new RegExp(`${quote}${edgeLazy}${GROUP}${gap}${GROUP}${edgeGreedy}${quote}`, 'g');
}

const PATTERNS = [
	quotedLiteralWithTwoWords("'"),
	quotedLiteralWithTwoWords('"'),
	quotedLiteralWithTwoWords('`')
] as const;

/**
 * Meldet jedes mehrwortige Zeichenketten-Literal in `source`.
 *
 * @returns Fundstellen (leer = konform), aufsteigend nach Zeile.
 */
export function findHardcodedStrings(source: string): SourceHit[] {
	return collectHits(stripComments(source), PATTERNS);
}

const SCHEMA_FILE = 'src/lib/form/validation/sightingSchema.ts';
const FORM_OPTIONS_DIR = 'src/lib/report/formOptions';

/**
 * Dateien, die dieser Scan bewusst nicht anfasst — je mit Begründung.
 *
 * `speciesIdentification.ts` ist die einzige Ausnahme: Sie trägt 316 Literale
 * Fachtext (elf Artdatensätze, Schicht E — Etappe 4 dieses Vorhabens, noch
 * nicht umgesetzt). Ihre beiden schmalen Label-Records
 * (`observabilityLabels`, `frequencyLabels`) sind davon nicht betroffen und
 * bereits über Botschaften abgedeckt — sie stehen im deutschen Schnappschuss
 * `germanBaseline.json`, und die Grenze zu den elf Artdatensätzen ist in
 * `germanBaseline.testutil.ts` bereits per Test markiert. Wer die Datei
 * später umbaut (Etappe 4), nimmt sie hier aus dieser Ausnahmeliste heraus.
 */
const EXEMPT_FILES: ReadonlyMap<string, string> = new Map([
	[
		`${FORM_OPTIONS_DIR}/speciesIdentification.ts`,
		'316 Literale Fachtext für elf Artdatensätze (Schicht E, Etappe 4 — noch nicht umgesetzt). Die beiden Label-Records der Datei sind bereits über Botschaften abgedeckt und stehen im Schnappschuss germanBaseline.json; die Grenze dorthin markiert germanBaseline.testutil.ts.'
	]
]);

/**
 * Der aktuelle Umfang: `sightingSchema.ts` plus alle `formOptions/*.ts` außer
 * den begründeten Ausnahmen und den Testdateien selbst.
 *
 * `.test.ts`/`.testutil.ts` bleiben draußen, weil dort Prosa (Testtitel,
 * konstruierte Beispiele — auch die dieser Datei) unvermeidlich mehrwortige
 * Literale enthält, ohne dass sie je an einer Formular-Oberfläche erscheinen.
 */
function scopeFiles(): string[] {
	const optionFiles = sourceFiles(FORM_OPTIONS_DIR, /\.ts$/).filter(
		(path) =>
			!path.endsWith('.test.ts') && !path.endsWith('.testutil.ts') && !EXEMPT_FILES.has(path)
	);

	return [SCHEMA_FILE, ...optionFiles];
}

describe('Mustererkennung', () => {
	it.each([
		[".label('Wo ungefähr?')", 'Wo ungefähr?'],
		[".max(255, 'Die Ortsbeschreibung ist zu lang')", 'Die Ortsbeschreibung ist zu lang'],
		[".meta({ helpText: 'Seegebiet oder Fahrwasser' })", 'Seegebiet oder Fahrwasser'],
		["[SpeciesEnum.HARBOR_PORPOISE]: 'Unbekannte Walart'", 'Unbekannte Walart']
	])('meldet das deutsche Literal in %s', (code) => {
		expect(findHardcodedStrings(code)).toHaveLength(1);
	});

	it('meldet ein englisches Literal ohne Umlaute genauso — keine Sprachheuristik', () => {
		const code = ".label('Please select a species')";

		expect(findHardcodedStrings(code)).toHaveLength(1);
	});

	it('meldet das doppelt-angeführte Literal genauso wie das einfach-angeführte', () => {
		const code = '.label("Bitte Tierart wählen")';

		expect(findHardcodedStrings(code)).toHaveLength(1);
	});

	it('meldet das Literal, auch wenn der Aufruf über zwei Zeilen umbricht', () => {
		const code = ['.label(', "\t'Wo ungefähr?'", ')'].join('\n');

		expect(findHardcodedStrings(code)).toEqual([{ line: 2, text: "'Wo ungefähr?'" }]);
	});

	it('meldet mehrere Fundstellen in einer Datei, aufsteigend nach Zeile', () => {
		const code = [
			".label('Wo ungefähr?')",
			".meta({ helpText: 'Seegebiet oder Fahrwasser' })"
		].join('\n');

		expect(findHardcodedStrings(code).map((hit) => hit.line)).toEqual([1, 2]);
	});
});

describe('Gegenproben', () => {
	/* Diese Gruppe wiegt schwerer als die obige. Eine Regel, die technische
	   Tokens oder den vorgeschriebenen Botschaftsweg mitnimmt, wird beim ersten
	   roten Lauf aufgeweicht statt befolgt — und ist danach schlechter als
	   keine. */

	it.each([
		"meta: { type: 'select' }",
		"autocomplete: 'given-name'",
		"icon: 'lucide:map-pin'",
		"toLocaleDateString('sv-SE', { hour: '2-digit' })",
		"placeholder: '12345'"
	])('lässt das technische Token %s durch — kein Leerzeichen im Literal', (code) => {
		expect(findHardcodedStrings(code)).toEqual([]);
	});

	it("lässt .test('is-valid-species', …) durch", () => {
		const code = ".test('is-valid-species', 'ungültige Art', (value) => isValidSpecies(value))";

		// Der Testname selbst hat kein Leerzeichen und bleibt durch. Die zweite
		// Zeichenkette ('ungültige Art') ist dagegen ein echtes Anzeigeliteral
		// und muss auffallen — die Gegenprobe darf das nicht verdecken.
		expect(findHardcodedStrings(code)).toEqual([{ line: 1, text: "'ungültige Art'" }]);
	});

	it('lässt den vorgeschriebenen Botschaftsaufruf durch', () => {
		const code = 'm.sighting_waterway_label({}, { locale })';

		expect(findHardcodedStrings(code)).toEqual([]);
	});

	it('lässt den Zeilenkommentar mit deutschem Satz durch', () => {
		const code = [
			'// Bitte wählen Sie eine Tierart — Begründung für die Auswahlreihenfolge.',
			'export const x = 1;'
		].join('\n');

		expect(findHardcodedStrings(code)).toEqual([]);
	});

	it('lässt den Blockkommentar mit deutschem Satz durch', () => {
		const code = [
			'/**',
			' * Bitte wählen Sie eine Tierart, wenn der Bestand mehrdeutig ist.',
			' */',
			'export const y = 2;'
		].join('\n');

		expect(findHardcodedStrings(code)).toEqual([]);
	});

	it.each([...EXEMPT_FILES.keys()])('nimmt die begründete Ausnahme %s aus dem Umfang', (path) => {
		expect(scopeFiles()).not.toContain(path);
	});
});

describe('Bestand', () => {
	it('findet außerhalb der begründeten Ausnahme kein mehrwortiges Literal', () => {
		const offenders = scopeFiles().flatMap((path) =>
			findHardcodedStrings(readFileSync(path, 'utf-8')).map(
				(hit) => `${path}:${hit.line} — ${hit.text}`
			)
		);

		expect(offenders, `${offenders.length} Fund(e).\n\n${REMEDIATION}\n`).toEqual([]);
	});

	/* Selbsttests. Ein Scan, der nichts liest, nichts erkennt oder ins Leere
	   zeigt, ist grün und beweist nichts. */
	it('scannt sightingSchema.ts und alle nicht ausgenommenen formOptions-Dateien', () => {
		const files = scopeFiles();

		expect(files).toContain(SCHEMA_FILE);
		expect(files.length).toBeGreaterThan(15);
		expect(files).not.toContain(`${FORM_OPTIONS_DIR}/speciesIdentification.ts`);
	});

	it('würde speciesIdentification.ts melden, stünde sie nicht auf der Ausnahmeliste', () => {
		const datei = readFileSync(`${FORM_OPTIONS_DIR}/speciesIdentification.ts`, 'utf-8');

		expect(findHardcodedStrings(datei).length).toBeGreaterThan(0);
	});

	it('nennt für die Ausnahme eine Begründung', () => {
		for (const reason of EXEMPT_FILES.values()) {
			expect(reason.length).toBeGreaterThan(40);
		}
	});
});
