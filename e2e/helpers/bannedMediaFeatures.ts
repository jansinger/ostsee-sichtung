/**
 * bannedMediaFeatures.ts — Media-Feature-Werte, die nie zutreffen.
 *
 * Eine `@media`-Regel mit einem Wert, den keine Engine kennt, ist keine
 * fehlgeschlagene Regel, sondern eine **stille**: Sie parst, sie steht im
 * Bundle, sie liest sich wie eine Zusage — und sie greift nie. Weder ein
 * Linter noch der Browser meldet das, und ein Kontrast-Test misst sie nicht,
 * weil sie schlicht nicht existiert.
 *
 * Der Bestandsfall war `@media (prefers-contrast: high)` in drei Komponenten.
 * `high` war der Entwurfsname des Merkmals; Media Queries Level 5 kennt
 * `no-preference | more | less | custom`, und Tailwinds Variante
 * `contrast-more:` erzeugt entsprechend `more`. Gemessen am 2026-08-09 mit
 * Playwright 1.62 (Chromium 151, WebKit 26.5), Kontext-Option
 * `contrast: 'more'`: `matchMedia('(prefers-contrast: high)').matches` ist in
 * beiden Engines `false`, `more` ist `true`, und eine CSS-Regel unter `high`
 * setzt auch dann nichts, wenn die Kontrasterhöhung aktiv ist. Die drei Blöcke
 * waren also seit ihrer Einführung tot.
 *
 * Geprüft wird — wie bei `bannedCss.ts` — der **Quelltext**, nicht das DOM: Ob
 * ein Merkmalswert existiert, ist am Quelltext entscheidbar, und ein DOM-Scan
 * könnte eine Regel, die nie greift, ohnehin nicht von einer unterscheiden,
 * deren Bedingung gerade nicht erfüllt ist.
 */

/** Eine Fundstelle im CSS, mit Zeilennummer für die Fehlermeldung. */
export interface MediaFeatureOffender {
	/** 1-basierte Zeile innerhalb der geprüften Datei. */
	readonly line: number;
	/** Die anstößige Zeile, getrimmt. */
	readonly text: string;
	/** Der tote Wert, z. B. `prefers-contrast: high`. */
	readonly feature: string;
	/** Der Wert, der stattdessen gemeint ist. */
	readonly replacement: string;
}

/**
 * Tote Merkmalswerte und ihr wirksames Gegenstück.
 *
 * `low` steht neben `high`, obwohl es im Bestand keine Fundstelle hat: Beide
 * kommen aus demselben Entwurf, und wer den einen aus einer alten Vorlage
 * kopiert, kopiert auch den anderen. Eine Regel, die nur die Schreibweise
 * kennt, die schon jemand benutzt hat, meldet die nächste nicht — dieselbe
 * Begründung wie bei den Farbfunktionen in `bannedCss.ts`.
 *
 * **Nicht erfasst ist `forced-colors`.** Das ist ein eigenes Merkmal mit
 * eigenen Werten (`active`/`none`) und kein Vorgänger von `prefers-contrast`;
 * eine Regel darauf ist wirksam und gehört nicht hierher.
 */
const DEAD_FEATURE_VALUES: ReadonlyArray<{
	readonly pattern: RegExp;
	readonly feature: string;
	readonly replacement: string;
}> = [
	{
		pattern: /prefers-contrast\s*:\s*high\b/,
		feature: 'prefers-contrast: high',
		replacement: 'prefers-contrast: more (Tailwind: contrast-more:)'
	},
	{
		pattern: /prefers-contrast\s*:\s*low\b/,
		feature: 'prefers-contrast: low',
		replacement: 'prefers-contrast: less (Tailwind: contrast-less:)'
	}
];

/**
 * Entfernt `/* … *\/`-Kommentare, behält aber die Zeilenstruktur.
 *
 * Aus demselben Grund wie in `bannedCss.ts`: Ohne das meldet der Test seine
 * eigene Dokumentation — die Begründungen im Bestand führen den toten Wert als
 * Gegenbeispiel auf —, und ohne Zeilenerhalt zeigt jede Fundstelle hinter dem
 * ersten mehrzeiligen Kommentar auf die falsche Zeile.
 */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/**
 * Meldet Media-Feature-Werte in `css`, die keine Engine auswertet.
 *
 * @param css CSS-Quelltext (ein `<style>`-Blockinhalt oder eine ganze Datei).
 * @param lineOffset Zeilen, die vor `css` in der Datei stehen — für die Nummer.
 * @returns Fundstellen (leer = konform).
 */
export function findDeadMediaFeatures(css: string, lineOffset = 0): MediaFeatureOffender[] {
	const offenders: MediaFeatureOffender[] = [];
	const lines = css.split('\n');

	stripComments(css)
		.split('\n')
		.forEach((line, index) => {
			for (const { pattern, feature, replacement } of DEAD_FEATURE_VALUES) {
				if (!pattern.test(line)) continue;

				offenders.push({
					line: lineOffset + index + 1,
					// Aus der Originalzeile, damit die Meldung zeigt, was dort wirklich steht.
					text: lines[index].trim(),
					feature,
					replacement
				});
			}
		});

	return offenders;
}
