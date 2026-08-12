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

/**
 * Die Ersetzungsform für eine Svelte-Markup-Fundstelle — je Position anders
 * (Auftrag, Aufgabe 2.2, Schritt 4):
 *
 *  - Textknoten: `{m.key()}` — der Knoten trägt bereits nur den reinen Text,
 *    keine Anführungszeichen zu ersetzen.
 *  - Attribut: `attr={m.key()}`, **einschließlich** der Anführungszeichen —
 *    `attr="{m.key()}"` wäre eine Zeichenketten-Interpolation, nicht der Wert
 *    selbst (Auftrag).
 *
 * **Kein `{ locale }`-Argument**, anders als `messageCall()` oben für Schicht
 * A/B: In Komponenten gibt es kein `locale`-Argument, Paraglide löst über die
 * aktive Locale auf — eine Komponente rendert immer in der Sprache der
 * Anfrage (Auftrag).
 */
function svelteMessageCall(key: string): string {
	return `m.${key}()`;
}

function svelteReplacement(site: ExtractionSite): string {
	if (site.aspect === 'text') {
		return `{${svelteMessageCall(site.key)}}`;
	}
	// Jeder andere Aspekt ist ein Attributname (siehe `SVELTE_TARGET_ATTRIBUTES`
	// in `collect.ts`) — `site.start`/`site.end` decken bei Attribut-Fundstellen
	// die GESAMTE Attributzuweisung ab (`name="wert"`), nicht nur den Wert.
	return `${site.aspect}={${svelteMessageCall(site.key)}}`;
}

/**
 * Ersetzt alle Svelte-Fundstellen einer Datei — von hinten nach vorn, aus
 * demselben Grund wie `applySitesToSource`.
 */
export function applySvelteSitesToSource(source: string, sites: ExtractionSite[]): string {
	const ordered = [...sites].sort((a, b) => b.start - a.start);
	let result = source;
	for (const site of ordered) {
		result = result.slice(0, site.start) + svelteReplacement(site) + result.slice(site.end);
	}
	return result;
}
