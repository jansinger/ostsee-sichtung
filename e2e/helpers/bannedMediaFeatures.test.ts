import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractStyleBlocks } from './bannedCss';
import { findDeadMediaFeatures, type MediaFeatureOffender } from './bannedMediaFeatures';

/**
 * bannedMediaFeatures.test.ts — Media-Feature-Werte, die nie zutreffen.
 *
 * Aufbau wie in `bannedCss.test.ts`: konstruierte Beispiele stellen die Regel
 * scharf, der Bestands-Scan hält den Bestand konform. Der Scan allein belegt
 * nichts über die Regel — er wäre auch grün, wenn das Muster eine Lücke hat.
 */

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('findDeadMediaFeatures', () => {
	/* Der Bestandsfall: stand bis 2026-08-09 in MediaThumbnail, MediaModal und
	   SpeciesIdentificationHelp und hat dort nie etwas bewirkt. */
	it('meldet prefers-contrast: high', () => {
		const offenders = findDeadMediaFeatures('@media (prefers-contrast: high) {');

		expect(offenders).toHaveLength(1);
		expect(offenders[0].feature).toBe('prefers-contrast: high');
		expect(offenders[0].replacement).toContain('more');
	});

	it('meldet prefers-contrast: low', () => {
		expect(findDeadMediaFeatures('@media (prefers-contrast: low) {')).toHaveLength(1);
	});

	it('sieht durch beliebigen Abstand um den Doppelpunkt hindurch', () => {
		expect(findDeadMediaFeatures('@media (prefers-contrast:high) {')).toHaveLength(1);
		expect(findDeadMediaFeatures('@media (prefers-contrast   :   high) {')).toHaveLength(1);
	});

	/* Die Gegenbeispiele. Ohne sie wird die Regel beim ersten Fehlalarm
	   abgeschaltet statt korrigiert. */
	it('lässt die wirksamen Werte durch', () => {
		for (const value of ['more', 'less', 'custom', 'no-preference']) {
			expect(findDeadMediaFeatures(`@media (prefers-contrast: ${value}) {`)).toEqual([]);
		}
	});

	it('lässt das merkmalslose (prefers-contrast) durch', () => {
		expect(findDeadMediaFeatures('@media (prefers-contrast) {')).toEqual([]);
	});

	/* `forced-colors` ist ein eigenes Merkmal, kein Vorgänger — und `high`
	   darin wäre ein anderer Fehler, den diese Regel nicht behauptet zu kennen. */
	it('fasst forced-colors nicht an', () => {
		expect(findDeadMediaFeatures('@media (forced-colors: active) {')).toEqual([]);
	});

	it('ignoriert den Wert in einem Kommentar', () => {
		expect(findDeadMediaFeatures('/* früher: prefers-contrast: high */')).toEqual([]);
	});

	it('zählt Zeilen hinter einem mehrzeiligen Kommentar richtig weiter', () => {
		const css = [
			'/* eine',
			'   Erklärung',
			'   über drei Zeilen */',
			'@media (prefers-contrast: high) {'
		].join('\n');

		expect(findDeadMediaFeatures(css)[0].line).toBe(4);
	});

	it('rechnet den Zeilenversatz der Datei auf', () => {
		expect(findDeadMediaFeatures('@media (prefers-contrast: high) {', 40)[0].line).toBe(41);
	});
});

/**
 * Der Bestands-Scan — der eigentliche Wächter.
 */
describe('Bestand — keine toten Media-Feature-Werte', () => {
	const format = (file: string, offenders: MediaFeatureOffender[]): string[] =>
		offenders.map(
			(o) => `${file}:${o.line} — ${o.feature} greift nie, gemeint ist ${o.replacement}`
		);

	it('kein toter Merkmalswert in einem <style>-Block einer Komponente', () => {
		const findings = globSync('src/**/*.svelte', { cwd: repoRoot })
			.map((file) => file.replaceAll('\\', '/'))
			.flatMap((file) => {
				const source = readFileSync(join(repoRoot, file), 'utf8');
				return extractStyleBlocks(source).flatMap((block) =>
					format(file, findDeadMediaFeatures(block.content, block.offset))
				);
			});

		expect(findings).toEqual([]);
	});

	it('kein toter Merkmalswert in einer CSS-Datei', () => {
		const findings = globSync('src/**/*.css', { cwd: repoRoot })
			.map((file) => file.replaceAll('\\', '/'))
			.flatMap((file) => {
				const source = readFileSync(join(repoRoot, file), 'utf8');
				return format(file, findDeadMediaFeatures(source));
			});

		expect(findings).toEqual([]);
	});
});
