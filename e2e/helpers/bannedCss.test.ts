import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	extractStyleBlocks,
	findCssColorOffenders,
	isExemptFile,
	type CssOffender
} from './bannedCss';

/**
 * bannedCss.test.ts — die Farbregel für handgeschriebenes CSS.
 *
 * Zwei Gruppen, aus demselben Grund wie in `bannedClasses.test.ts`:
 *
 * 1. **Konstruierte Beispiele** stellen die Regel scharf. Ein Scan über einen
 *    konformen Bestand belegt nichts über die Regel — er ist grün, auch wenn
 *    das Muster eine Lücke hat.
 * 2. **Der Scan über den Bestand** hält ihn konform. Er ist der Wächter, der
 *    dem Klassen-Scan in `design-tokens.spec.ts` bisher gefehlt hat: Der sieht
 *    nur DOM-Klassen, ein `<style>`-Block hat keine.
 *
 * Beides läuft in Node und damit in `npm run test:quick`.
 */

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('findCssColorOffenders', () => {
	/* Der eigentliche Testfall dieses Reviews: die Deklaration, die der
	   Klassen-Scan strukturell nicht sehen konnte. Sie ist keine Erfindung —
	   sie stand in MediaThumbnail.svelte, in dem File, dessen Kommentar die
	   Abschaffung genau dieses Musters erklärt. */
	it('meldet rgba() in einer Deklaration', () => {
		const offenders = findCssColorOffenders('background-color: rgba(0, 0, 0, 0.9) !important;');

		expect(offenders).toHaveLength(1);
		expect(offenders[0].literal).toBe('rgba()');
	});

	it('meldet Hex-Farben in allen drei Längen', () => {
		for (const hex of ['#0af', '#00aaff', '#00aaffcc']) {
			expect(findCssColorOffenders(`color: ${hex};`)).toHaveLength(1);
		}
	});

	it('meldet oklch() außerhalb der Token-Datei', () => {
		expect(findCssColorOffenders('color: oklch(0.55 0.18 25);')).toHaveLength(1);
	});

	/* Die Gegenbeispiele. Ohne sie wird die Regel beim ersten Fehlalarm
	   abgeschaltet statt korrigiert. */
	it('lässt Token-Zugriffe durch', () => {
		expect(findCssColorOffenders('background-color: var(--color-base-200);')).toEqual([]);
	});

	it('lässt einen Literal-Fallback neben einem Token durch', () => {
		expect(findCssColorOffenders('color: var(--color-primary, #0af);')).toEqual([]);
	});

	/* Die Umgehung, die der erste Wurf offenließ: Die Zeile wurde komplett
	   übersprungen, sobald irgendwo ein `var(` darin stand. Ein Literal daneben
	   blieb damit unsichtbar — und das ist keine konstruierte Form. Genau so sah
	   das Lade-Streifenmuster aus, das dieser PR aus MediaThumbnail entfernt hat:
	   ein linear-gradient() aus var()-Stops. Wer dort ein #fff einsetzt, hätte
	   einen grünen Test gehabt. */
	it('meldet ein Literal, das neben einem var() in derselben Zeile steht', () => {
		const offenders = findCssColorOffenders('background-image: linear-gradient(#0af, var(--x));');

		expect(offenders).toHaveLength(1);
		expect(offenders[0].literal).toBe('#0af');
	});

	it('meldet ein Literal neben einem color-mix() in derselben Zeile', () => {
		expect(
			findCssColorOffenders('background: color-mix(in oklab, var(--a) 50%, var(--b)) , #abcdef;')
		).toHaveLength(1);
	});

	it('sieht durch ein verschachteltes var() hindurch', () => {
		expect(findCssColorOffenders('color: var(--a, var(--b, #fff));')).toEqual([]);
		expect(findCssColorOffenders('color: var(--a, var(--b)) #fff;')).toHaveLength(1);
	});

	it('lässt color-mix() durch — die Farben darin kommen aus Tokens', () => {
		expect(
			findCssColorOffenders('background: color-mix(in oklab, var(--color-info) 12%, white);')
		).toEqual([]);
	});

	it('lässt transparent und currentColor durch', () => {
		expect(findCssColorOffenders('border: 1px solid currentColor;')).toEqual([]);
		expect(findCssColorOffenders('background: transparent;')).toEqual([]);
	});

	/* Der Kommentar-Fall. Die Begründungen im Bestand führen die verbotenen
	   Werte als Gegenbeispiel auf; ein Test, der die eigene Dokumentation
	   anmeckert, wird abgeschaltet. */
	it('ignoriert Farbwerte in Kommentaren', () => {
		expect(findCssColorOffenders('/* früher stand hier rgba(0, 0, 0, 0.9) */')).toEqual([]);
	});

	it('zählt Zeilen hinter einem mehrzeiligen Kommentar richtig weiter', () => {
		const css = [
			'/* Zeile 1',
			'   Zeile 2 mit #abcdef als Gegenbeispiel',
			'*/',
			'color: #123456;'
		].join('\n');

		const offenders = findCssColorOffenders(css);

		expect(offenders).toHaveLength(1);
		expect(offenders[0].line).toBe(4);
	});

	it('rechnet den Zeilenversatz der Datei auf', () => {
		expect(findCssColorOffenders('color: #123456;', 40)[0].line).toBe(41);
	});
});

describe('extractStyleBlocks', () => {
	/* Geprüft wird die Zeilennummer, die am Ende in der Meldung steht — nicht der
	   Versatz für sich. Der ist ein Zwischenwert, und ob er 2 oder 3 sein muss,
	   hängt daran, dass `match[1]` mit dem Zeilenumbruch hinter `<style>`
	   beginnt. Genau diese Kopplung soll der Test halten; eine Erwartung auf den
	   Zwischenwert allein hätte sie nicht bemerkt. */
	it('findet den Block, und die Fundstelle trägt die Zeile der Datei', () => {
		const source = ['<div />', '', '<style>', '\tcolor: #123456;', '</style>'].join('\n');

		const blocks = extractStyleBlocks(source);
		expect(blocks).toHaveLength(1);

		const offenders = findCssColorOffenders(blocks[0].content, blocks[0].offset);
		expect(offenders).toHaveLength(1);
		// `color: #123456;` steht in Zeile 4 der Datei (1-basiert).
		expect(offenders[0].line).toBe(4);
	});

	it('findet auch <style lang="postcss">', () => {
		expect(extractStyleBlocks('<style lang="postcss">a{}</style>')).toHaveLength(1);
	});

	/* Die Zeichenfolge `<style>` steht im Bestand auch in Prosa: Kommentare
	   erklären, welcher Wert früher „im scoped <style>" stand. Ohne Maskierung
	   beginnt der erste Treffer dort — der Ausschnitt trägt dann Kommentar-Rest
	   und Markup, und ein Farbwert aus der Begründung wird als CSS gemeldet.
	   Genau das ist am 2026-08-09 passiert. */
	it('ignoriert die Zeichenfolge <style> in einem Markup-Kommentar', () => {
		const source = [
			'<!-- Stand vorher im scoped <style> als #abcdef und umging das Theme. -->',
			'<div />',
			'',
			'<style>',
			'\tcolor: var(--color-primary);',
			'</style>'
		].join('\n');

		const blocks = extractStyleBlocks(source);

		expect(blocks).toHaveLength(1);
		expect(blocks.flatMap((b) => findCssColorOffenders(b.content, b.offset))).toEqual([]);
	});

	/* Der teurere Fall: Beginnt ein Treffer im Kommentar, verschmelzen der echte
	   Block davor und der danach zu einer anderen Aufteilung — die Auswertung
	   redet dann über etwas anderes als die Datei. Geprüft wird deshalb, dass
	   genau das echte Literal gemeldet wird, mit seiner Zeile, und sonst nichts. */
	it('meldet einen echten Block vor einem Kommentar mit der Zeichenfolge <style>', () => {
		const source = [
			'<style>',
			'\tcolor: #123456;',
			'</style>',
			'',
			'<!-- Der Wert stand vorher im <style> als #abcdef. -->',
			'',
			'<style>',
			'\tcolor: var(--color-primary);',
			'</style>'
		].join('\n');

		const blocks = extractStyleBlocks(source);
		expect(blocks).toHaveLength(2);

		const offenders = blocks.flatMap((b) => findCssColorOffenders(b.content, b.offset));
		expect(offenders).toHaveLength(1);
		expect(offenders[0].literal).toBe('#123456');
		expect(offenders[0].line).toBe(2);
	});
});

describe('isExemptFile', () => {
	it('nimmt die Token-Datei aus', () => {
		expect(isExemptFile('src/css/tokens.css')).toBe(true);
	});

	it('nimmt eine beliebige andere Datei unter src/css nicht aus', () => {
		expect(isExemptFile('src/css/neue-datei.css')).toBe(false);
	});
});

/**
 * Der Bestands-Scan.
 *
 * Er ist der eigentliche Wächter — die Gruppen oben stellen nur die Regel
 * scharf, mit der er misst.
 */
describe('Bestand — keine Farbliterale am Theme vorbei', () => {
	const format = (file: string, offenders: CssOffender[]): string[] =>
		offenders.map((o) => `${file}:${o.line} — ${o.literal} in \`${o.text}\``);

	it('kein Farbliteral in einem <style>-Block einer Komponente', () => {
		const findings = globSync('src/**/*.svelte', { cwd: repoRoot })
			.map((file) => file.replaceAll('\\', '/'))
			.flatMap((file) => {
				const source = readFileSync(join(repoRoot, file), 'utf8');
				return extractStyleBlocks(source).flatMap((block) =>
					format(file, findCssColorOffenders(block.content, block.offset))
				);
			});

		expect(findings).toEqual([]);
	});

	it('kein Farbliteral in einer CSS-Datei außerhalb der Token-Quelle', () => {
		const findings = globSync('src/**/*.css', { cwd: repoRoot })
			.map((file) => file.replaceAll('\\', '/'))
			.filter((file) => !isExemptFile(file))
			.flatMap((file) => {
				const source = readFileSync(join(repoRoot, file), 'utf8');
				return format(file, findCssColorOffenders(source));
			});

		expect(findings).toEqual([]);
	});
});
