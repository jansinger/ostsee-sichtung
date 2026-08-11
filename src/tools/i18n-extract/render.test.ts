import { describe, expect, it } from 'vitest';
import { collectSchemaSites } from './collect';
import type { ExtractionSite, SkippedSite } from './collect';
import { createKeyRegistry } from './messageKey';
import {
	applySitesToSource,
	renderDryRunReport,
	renderUnifiedDiff,
	type ExtractionPlan
} from './render';

describe('applySitesToSource', () => {
	it('ersetzt das Literal durch den Botschaftsaufruf', () => {
		const source = `const s = yup.object().shape({ a: yup.string().label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		expect(applySitesToSource(source, sites)).toBe(
			`const s = yup.object().shape({ a: yup.string().label(m.sighting_a_label({}, { locale })) });`
		);
	});

	// Von hinten nach vorn ersetzen: Sonst verschieben frühere Ersetzungen die
	// Offsets aller späteren. Zwei Literale im selben Aufruf machen das sichtbar.
	it('hält die Offsets bei mehreren Ersetzungen in einer Zeile', () => {
		const source = `const s = yup.object().shape({ a: yup.string().max(9, 'zu lang').label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		const result = applySitesToSource(source, sites);
		expect(result).toContain('m.sighting_a_max({}, { locale })');
		expect(result).toContain('m.sighting_a_label({}, { locale })');
		expect(result).not.toContain(`'zu lang'`);
		expect(result).not.toContain(`'Titel'`);
	});

	it('lässt die Quelle unverändert, wenn es keine Fundstellen gibt', () => {
		const source = `const x = 1;`;
		expect(applySitesToSource(source, [])).toBe(source);
	});
});

describe('renderUnifiedDiff', () => {
	it('zeigt geänderte Zeilen mit - und + und nennt die Datei', () => {
		const diff = renderUnifiedDiff('a/b.ts', `eins\nzwei\n`, `eins\nZWEI\n`);
		expect(diff).toContain('--- a/b.ts');
		expect(diff).toContain('+++ a/b.ts');
		expect(diff).toContain('-zwei');
		expect(diff).toContain('+ZWEI');
	});

	it('liefert Leertext, wenn nichts geändert wurde', () => {
		expect(renderUnifiedDiff('a/b.ts', `eins\n`, `eins\n`)).toBe('');
	});
});

describe('renderDryRunReport', () => {
	function buildSite(overrides: Partial<ExtractionSite> = {}): ExtractionSite {
		return {
			file: 'src/lib/form/validation/sightingSchema.ts',
			line: 12,
			start: 40,
			end: 48,
			text: 'Titel',
			key: 'sighting_a_label',
			aspect: 'label',
			field: 'a',
			...overrides
		};
	}

	function buildSkipped(overrides: Partial<SkippedSite> = {}): SkippedSite {
		return {
			file: 'src/lib/form/validation/sightingSchema.ts',
			line: 21,
			text: 'sichtung',
			aspect: 'meta.icon',
			reason: 'meta-key-denied',
			explanation: 'nicht-sprachlicher meta-Schlüssel',
			...overrides
		};
	}

	function buildPlan(overrides: Partial<ExtractionPlan> = {}): ExtractionPlan {
		const site = buildSite();
		return {
			files: [
				{
					file: site.file,
					before: `const s = yup.string().label('Titel');`,
					after: `const s = yup.string().label(m.sighting_a_label({}, { locale }));`,
					sites: [site]
				}
			],
			skipped: [],
			...overrides
		};
	}

	it('führt jeden übersprungenen Eintrag mit Datei, Zeile, Aspekt, Text und Erklärung auf', () => {
		const skippedMetaKey = buildSkipped({
			file: 'a.ts',
			line: 21,
			text: 'sichtung',
			aspect: 'meta.icon',
			reason: 'meta-key-denied',
			explanation: 'nicht-sprachlicher meta-Schlüssel'
		});
		const skippedTestName = buildSkipped({
			file: 'b.ts',
			line: 55,
			text: 'wal-1',
			aspect: 'test',
			reason: 'test-name-argument',
			explanation: 'erstes Argument von yup.test() ist ein interner Name, keine Botschaft'
		});
		const plan = buildPlan({ skipped: [skippedMetaKey, skippedTestName] });

		const report = renderDryRunReport(plan);

		expect(report).toContain('## Übersprungen — bitte durchsehen');
		expect(report).toContain(
			'- a.ts:21 (meta.icon) `sichtung` — nicht-sprachlicher meta-Schlüssel'
		);
		expect(report).toContain(
			'- b.ts:55 (test) `wal-1` — erstes Argument von yup.test() ist ein interner Name, keine Botschaft'
		);
	});

	it('nennt die Gesamtzahlen für Botschaften und Übersprungene', () => {
		const plan = buildPlan({ skipped: [buildSkipped(), buildSkipped({ file: 'c.ts', line: 3 })] });

		const report = renderDryRunReport(plan);

		expect(report).toContain('Botschaften: 1 — übersprungen: 2');
	});

	it('listet die Botschaften je Datei auf', () => {
		const plan = buildPlan();

		const report = renderDryRunReport(plan);

		expect(report).toContain('## Botschaften je Datei');
		expect(report).toContain('- src/lib/form/validation/sightingSchema.ts: 1');
	});

	it('enthält im JSON-Block Schlüssel und deutschen Text der geplanten Botschaften', () => {
		const plan = buildPlan();

		const report = renderDryRunReport(plan);

		expect(report).toContain('```json');
		expect(report).toContain('"sighting_a_label": "Titel"');
	});

	// Befund B.2: Der Abschnitt „Geplante Diffs" war unbehauptet — eine Mutation,
	// die die ```diff-Umrandung kaputtmacht (z.B. das schließende ``` weglässt
	// oder aus ```diff ein ``` macht), ließ alle Tests grün. Dieser Test
	// verlangt die Umrandung als zusammenhängenden Block, nicht nur, dass Titel
	// und Inhalt irgendwo im Bericht vorkommen.
	it('bettet den Diff im Abschnitt „Geplante Diffs" in einen ```diff-Codeblock ein', () => {
		const plan = buildPlan();

		const report = renderDryRunReport(plan);
		const diff = renderUnifiedDiff(
			plan.files[0]!.file,
			plan.files[0]!.before,
			plan.files[0]!.after
		);

		expect(report).toContain('## Geplante Diffs');
		expect(report).toContain(['```diff', diff, '```', ''].join('\n'));
	});
});
