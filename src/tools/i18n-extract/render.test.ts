import { describe, expect, it } from 'vitest';
import { collectSchemaSites } from './collect';
import { createKeyRegistry } from './messageKey';
import { applySitesToSource, renderUnifiedDiff } from './render';

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
