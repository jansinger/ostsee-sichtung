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
