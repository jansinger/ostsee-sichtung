/**
 * @fileoverview Gemeinsame Textaufbereitung für die Quelltext-Guards.
 *
 * **Warum dieses Modul existiert.** `approvalPredicateScan.test.ts` und
 * `verifiedReadScan.test.ts` durchsuchen beide den Quelltext unter `src/` nach
 * einem verbotenen Muster, und beide müssen dafür Kommentare ausblenden — sonst
 * verbietet die Regel ihre eigene Begründung. Der zweite Guard hatte dafür
 * zunächst eine eigene, schwächere Variante (`z.split('//')[0]` plus
 * `startsWith('*')`). Zwei Verfahren für dieselbe Aufgabe altern getrennt: Die
 * hier unten dokumentierten URL- und Glob-Fallen waren in der einfachen Variante
 * beide offen.
 *
 * **Warum `.testutil.ts` und warum unter `src/lib/testing/`.** Der Code läuft
 * ausschließlich in Guards; ausgeliefert wird er nie. `vitest.config.ts` nimmt
 * `src/lib/**\/*.ts` in die Coverage auf und schließt nur `**\/*.testutil.ts`
 * aus — ohne das Suffix zählte diese Datei als ungedeckter Produktionscode
 * (dieselbe Begründung wie bei `withTimeZone.testutil.ts`). Unter
 * `src/lib/server/db/` läge sie falsch: Sie weiß nichts von Datenbank oder
 * Prädikat, sie kennt nur Kommentarsyntax. Ein Import aus einer `.test.ts`
 * wiederum verbietet sich, weil der importierende Guard damit die Testfälle der
 * anderen Datei mitlüde.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ersetzt Kommentare durch Leerzeichen — Länge und Zeilenumbrüche bleiben.
 *
 * Kommentare sind ausgenommen, weil die Regeln sonst ihre eigene Begründung
 * verböten: Das Datei-Doc von `approvalFilter.ts`, die Regeldateien und die
 * Prosa in `showreports.json/+server.ts` zitieren das Freigabe-Prädikat
 * wörtlich; der Verify-Endpunkt erklärt in Kommentaren, warum er die Spalte
 * `geprueft` weiterhin schreibt. Der Fall ist auch nicht theoretisch —
 * `api/media/[...path]/+server.ts` trägt hinter `!!file.approvedAt` den
 * Kommentar „File is approved if approvedAt is not null", der ohne diesen
 * Schritt ein Treffer wäre.
 *
 * Ein einziger Durchlauf mit Alternation, damit der **frühere** Kommentaranfang
 * gewinnt: `/* x // y *\/` wird als Block erkannt, `// foo /* bar` als Zeile.
 * Zwei getrennte Läufe hätten je nach Reihenfolge einen der beiden Fälle
 * falsch aufgelöst und im schlimmeren davon echten Code mitgelöscht.
 *
 * `<!-- … -->` steht daneben, seit auch `.svelte`-Dateien gescannt werden. In
 * Svelte-Markup gibt es keine `//`-Kommentare; eine Begründung neben dem Markup
 * ist dort **die** Kommentarform (CLAUDE.md verlangt sie sogar ausdrücklich
 * dort statt im `<script>`-Block). Ohne diesen Zweig wäre jede solche
 * Begründung ein Treffer.
 *
 * Das `(?<!:)` hält `https://` heraus, das `(?<!\w)` den MIME-Glob: `'image/*'`
 * hat sonst einen Blockkommentar eröffnet, der bis zum nächsten `*\/` alles
 * verschluckt hat — gemessen 174 Zeilen ab Zeile 200 in
 * `UnifiedDropzone.svelte.test.ts`, 82 ab Zeile 40 in
 * `DropzoneEnhanced.svelte.test.ts` und zusammen 215 Zeilen in fünf Dateien.
 * Das war genau die Bauart Lücke, gegen die diese Guards antreten: still, grün
 * und im Bestand bereits aktiv.
 *
 * Der verbleibende Rest an Unschärfe — eine Zeichenkette, die `//` enthält und
 * hinter der auf derselben Zeile ein Verstoß steht — ist bekannt und in Kauf
 * genommen; ausgeschlossen wäre er nur mit einem echten Parser.
 *
 * Ersetzt wird längentreu, damit die Zeilennummer in der Fehlermeldung auf die
 * Originaldatei zeigt.
 */
export function stripComments(source: string): string {
	return source.replace(/(?<!\w)\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<!:)\/\/[^\n]*/g, (comment) =>
		comment.replace(/[^\n]/g, ' ')
	);
}

/** Eine Fundstelle, so wie sie in der Fehlermeldung eines Guards erscheint. */
export interface SourceHit {
	/** 1-basierte Zeile in der Originaldatei. */
	readonly line: number;
	/** Der getroffene Ausdruck, auf eine Zeile normalisiert. */
	readonly text: string;
}

/**
 * Sammelt die Treffer aller `patterns` in bereits kommentarfreiem `code`.
 *
 * Eine Meldung je Zeile: Derselbe Ausdruck kann mehrere Muster erfüllen, und
 * zwei Meldungen wären dieselbe Fundstelle, doppelt gezählt.
 */
export function collectHits(code: string, patterns: readonly RegExp[]): SourceHit[] {
	const hits = new Map<number, SourceHit>();

	for (const pattern of patterns) {
		for (const match of code.matchAll(pattern)) {
			const index = match.index ?? 0;
			const line = code.slice(0, index).split('\n').length;
			if (!hits.has(line)) {
				hits.set(line, { line, text: match[0].replace(/\s+/g, ' ').trim() });
			}
		}
	}

	return [...hits.values()].sort((a, b) => a.line - b.line);
}

/**
 * Ein Buchstabe, inklusive der im Formular vorkommenden Umlaute/Akzente
 * (Latin-1-Supplement-Block ohne `×`/`÷`). Absichtlich keine Umlaut-Heuristik
 * für die Entscheidung selbst — nur die Definition von „Buchstabe", damit
 * `wählen` als eine Gruppe zählt und nicht als drei.
 */
const LETTER = String.raw`[A-Za-zÀ-ÖØ-öø-ÿ]`;

/** Eine Buchstabengruppe: mindestens zwei Buchstaben am Stück. */
const GROUP_PATTERN = new RegExp(`${LETTER}{2,}`, 'g');

/**
 * Baut das Muster, das ein Zeichenketten-Literal **extrahiert** — ohne jede
 * Aussage darüber, ob es ein Befund ist. Das entscheidet erst
 * {@link isMultiWordLiteral} in einem zweiten, von Regex unabhängigen Schritt.
 *
 * Für `'`/`"` ist ein Zeilenumbruch innerhalb des Literals ausgeschlossen
 * (`[^quote\\\n]`) — ein echtes `'…'`/`"…"`-Literal kann ihn syntaktisch nicht
 * enthalten. Template-Literale (`` ` ``) dürfen dagegen echte Zeilenumbrüche
 * enthalten und bekommen den Ausschluss nicht.
 *
 * **Warum das ohne Längengrenze linear bleibt.** Der Vorläufer dieses Musters
 * bettete die Suche nach den zwei Buchstabengruppen direkt in die
 * Literal-Erkennung ein: Rand-vor-Gruppe-1, Lücke, Rand-nach-Gruppe-2 — vier
 * Quantoren, die sich dasselbe Alphabet teilen und deren Aufteilung der Motor
 * bei einem Literal ohne schließendes Gegenstück kombinatorisch prüfen musste
 * (gemessen über 8 Sekunden bei 20.000 Zeichen). Diese Fassung hat nur **eine**
 * quantifizierte Alternation (`(?:${body})*`), und die beiden Alternativen
 * schließen sich für jedes Zeichen gegenseitig aus — ein Backslash startet
 * ausschließlich `\\.`, jedes andere Zeichen ausschließlich die erste
 * Alternative. Damit gibt es für jede Zeichenfolge genau **eine** Art, sie zu
 * konsumieren, keine Aufteilung zum Ausprobieren.
 */
function stringLiteralPattern(quote: "'" | '"' | '`'): RegExp {
	const excludeNewline = quote === '`' ? '' : '\\n';
	const body = `[^${quote}\\\\${excludeNewline}]|\\\\.`;
	return new RegExp(`${quote}(?:${body})*${quote}`, 'g');
}

const LITERAL_PATTERNS = [
	stringLiteralPattern("'"),
	stringLiteralPattern('"'),
	stringLiteralPattern('`')
] as const;

/**
 * Die eigentliche Regel — ohne Längengrenze, weil sie in reinem JavaScript auf
 * dem bereits extrahierten Literal prüft statt in der Regex-Suche mitzulaufen:
 * „Enthält Leerzeichen UND mindestens zwei Buchstabengruppen“. `literal` trägt
 * die umschließenden Anführungszeichen noch — die zählen für beide Bedingungen
 * nicht mit, stören aber auch nicht (kein Leerzeichen, kein Buchstabe).
 *
 * **Bewusst ohne Sprachheuristik.** Eine Umlaut-Regel versagte genau dort, wo
 * es zählt: Eine versehentlich englisch hartcodierte Zeichenkette hat keine
 * Umlaute. Diese Regel trifft `'Bitte wählen Sie eine Tierart'` und
 * `'Please select a species'` gleichermaßen und lässt technische Tokens ohne
 * Leerzeichen durch (`'select'`, `'given-name'`, `'lucide:map-pin'`, `'sv-SE'`).
 */
export function isMultiWordLiteral(literal: string): boolean {
	if (!/\s/.test(literal)) return false;
	const groups = literal.match(GROUP_PATTERN);
	return (groups?.length ?? 0) >= 2;
}

/**
 * Sammelt mehrwortige Zeichenketten-Literale in `code`.
 *
 * **`stripComments` ist Sache des Aufrufers** — die beiden Nutzer brauchen
 * unterschiedliche Vorbereitung (`hardcodedStringScan` die ganze Datei,
 * `hardcodedMarkupScan` nur die `<script>`-Blöcke), und ein hier eingebauter
 * Aufruf liefe beim zweiten doppelt.
 *
 * Eigene, zweistufige Sammelfunktion statt {@link collectHits}: Dort ist jeder
 * Regex-Treffer ein Befund, hier ist die Extraktion (Regex, Stufe 1) von der
 * Bewertung (JavaScript, Stufe 2 — {@link isMultiWordLiteral}) getrennt.
 *
 * Eine Meldung je Zeile, wie bei {@link collectHits} — derselbe Ausdruck kann
 * für mehrere Anführungszeichen-Arten in Frage kommen, das darf nicht doppelt
 * zählen.
 */
export function multiWordLiterals(code: string): SourceHit[] {
	const hits = new Map<number, SourceHit>();

	for (const pattern of LITERAL_PATTERNS) {
		for (const match of code.matchAll(pattern)) {
			const literal = match[0];
			if (!isMultiWordLiteral(literal)) continue;

			const index = match.index ?? 0;
			const line = code.slice(0, index).split('\n').length;
			if (!hits.has(line)) {
				hits.set(line, { line, text: literal.replace(/\s+/g, ' ').trim() });
			}
		}
	}

	return [...hits.values()].sort((a, b) => a.line - b.line);
}

/**
 * Rekursiv alle Dateien unter `root`, deren Name auf `extensions` passt.
 *
 * Der Extension-Filter ist nicht kosmetisch: Ohne ihn liest der Scan auch
 * Webfonts, GeoJSON und PNGs als UTF-8 ein — 751 Dateien statt der paar hundert
 * Quelldateien, und jedes Binärformat kann dabei zufällig ein Muster erfüllen.
 */
export function sourceFiles(root: string, extensions: RegExp): string[] {
	const files: string[] = [];

	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir).sort()) {
			const path = join(dir, entry);
			if (statSync(path).isDirectory()) {
				walk(path);
				continue;
			}
			if (extensions.test(entry)) files.push(path.replaceAll('\\', '/'));
		}
	};

	walk(root);
	return files;
}
