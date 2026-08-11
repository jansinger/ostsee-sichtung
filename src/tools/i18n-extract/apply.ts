/**
 * Die Quelltransformation: Fundstellen durch Botschaftsaufrufe ersetzen.
 *
 * **Auch diese Datei schreibt nichts.** Sie baut nur die geänderte Quelle als
 * Zeichenkette; ob und wann etwas auf die Platte kommt, entscheidet eine
 * spätere Aufgabe. Eigenes Modul (statt Teil von `render.ts`), weil das hier
 * die eigentliche Schreiblogik ist, die eine spätere Aufgabe tatsächlich
 * anwenden wird — `render.ts` bleibt reine Berichtsformatierung.
 */
import type { ExtractionSite } from './collect';

/** Der Aufruf, der an die Stelle des Literals tritt. */
function messageCall(key: string): string {
	return `m.${key}({}, { locale })`;
}

/**
 * Ersetzt alle Fundstellen einer Datei.
 *
 * **Von hinten nach vorn.** Jede Ersetzung ändert die Länge des Textes; würde
 * vorn begonnen, zeigten alle späteren Offsets ins Leere. Das ist auch der
 * Grund, warum `collect.ts` Offsets liefert und keine Suchtexte: Bei 19
 * Dubletten träfe ein Suchen-und-Ersetzen die falsche Stelle.
 */
export function applySitesToSource(source: string, sites: ExtractionSite[]): string {
	const ordered = [...sites].sort((a, b) => b.start - a.start);
	let result = source;
	for (const site of ordered) {
		result = result.slice(0, site.start) + messageCall(site.key) + result.slice(site.end);
	}
	return result;
}
